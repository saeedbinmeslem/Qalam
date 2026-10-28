/**
 * @file learning-agent.ts
 * @description حلقة قرار وكيل التعلّم: observe ← decide ← act ← record.
 *  - observe: المسار وأحداث المتعلم (إكمال، قرارات سابقة، نتائج الاختبارات، التشخيصي).
 *  - decide: قواعد Domain الحتمية (`decideNextStep`)؛ لا يتدخل النموذج في القرار.
 *  - act: صياغة شرح للقرار عبر `LlmClient` (اختياري، يُتحقق بمخطط، وفشله لا يمنع شيئًا).
 *  - record: حدث `plan_decision` بسببه؛ ولا يتكرر لنفس الأدلة (بصمة `evidenceKey`).
 */

import { LearningEvent, decideNextStep, type AgentAction, type AgentDecision, type PathId } from '@qalam/domain';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { LlmClient } from '../ports/llm-client.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';
import { DECISION_EXPLANATION_SCHEMA, parseDecisionExplanation } from './decision-explanation.js';

export interface AgentAdvice {
  decision: AgentDecision;
  lessonTitle: string;
  alternativeLessonTitle?: string;
  /** شرح صاغه النموذج (إن وُجد النموذج ونجح) */
  explanation?: string;
  /** هل سُجّل هذا القرار الآن (وليس مكررًا لقرار سابق بنفس الأدلة)؟ */
  isNew: boolean;
}

/** قرار سابق كما سُجّل، لعرض «لماذا اقترحنا هذا؟» */
export interface AgentDecisionRecord {
  action: AgentAction;
  lessonId: string;
  reason: string;
  explanation?: string;
  decidedAt: Date;
}

export interface LearningAgentDeps {
  paths: PathRepositoryPort;
  events: EventReaderPort;
  recorder: EventRecorderPort;
  clock: ClockPort;
  /** اختياري: بدونه يعمل الوكيل كاملًا بالقواعد وحدها */
  llm?: LlmClient;
}

const OBSERVED = ['lesson_completed', 'plan_decision', 'attempt_submitted', 'diagnostic_completed'] as const;
const ACTIONS: readonly AgentAction[] = ['proceed', 'review_lesson', 'retake_quiz', 'alternative_lesson', 'spaced_review'];

function toRecord(event: LearningEvent): (AgentDecisionRecord & { pathId: string; evidenceKey: string }) | null {
  const p = event.payload;
  if (event.type !== 'plan_decision' || p['source'] !== 'agent') return null;
  const { decision, lessonId, reason, pathId, evidenceKey, explanation } = p;
  if (typeof decision !== 'string' || !ACTIONS.includes(decision as AgentAction)) return null;
  if (typeof lessonId !== 'string' || typeof reason !== 'string' || typeof pathId !== 'string') return null;
  return {
    action: decision as AgentAction,
    lessonId,
    reason,
    pathId,
    evidenceKey: typeof evidenceKey === 'string' ? evidenceKey : '',
    ...(typeof explanation === 'string' ? { explanation } : {}),
    decidedAt: event.occurredAt,
  };
}

export class LearningAgent {
  constructor(private readonly deps: LearningAgentDeps) {}

  /** دورات تعمل الآن لكل (متعلم، مسار): تُنفَّذ بالتسلسل لئلا يسجّل طلبان متزامنان القرار نفسه مرتين */
  private readonly running = new Map<string, Promise<unknown>>();

  /** دورة كاملة. يعيد null إذا انتهى المسار فلا قرار. */
  async run(request: { userId: string; pathId: PathId }): Promise<AgentAdvice | null> {
    const key = `${request.userId}:${request.pathId}`;
    const turn = (this.running.get(key) ?? Promise.resolve()).catch(() => undefined).then(() => this.runOnce(request));
    this.running.set(key, turn);
    try {
      return await turn;
    } finally {
      if (this.running.get(key) === turn) this.running.delete(key);
    }
  }

  private async runOnce(request: { userId: string; pathId: PathId }): Promise<AgentAdvice | null> {
    const { paths, events, recorder, clock } = this.deps;

    // observe
    const path = await paths.findById(request.pathId);
    if (!path) throw new Error(`المسار التعليمي ذو المعرّف "${request.pathId}" غير موجود`);
    const observed = await events.listByUser(request.userId, OBSERVED);

    // decide
    const decision = decideNextStep(path, observed, clock.now());
    if (!decision) return null;
    const title = (id: string) => path.modules.flatMap((m) => m.lessons).find((l) => l.id === id)?.title ?? id;
    const view = {
      decision,
      lessonTitle: title(decision.lessonId),
      ...(decision.alternativeLessonId ? { alternativeLessonTitle: title(decision.alternativeLessonId) } : {}),
    };

    // نفس الأدلة سُجّل قرارها من قبل: نعيده كما هو (بشرحه) بلا تسجيل ولا استدعاء نموذج
    const previous = this.agentRecords(observed, path.id).at(-1);
    if (previous && previous.evidenceKey === decision.evidenceKey) {
      return { ...view, ...(previous.explanation ? { explanation: previous.explanation } : {}), isNew: false };
    }

    // act
    const explanation = decision.action === 'proceed' ? null : await this.explain(view);

    // record
    await recorder.record(
      new LearningEvent({
        userId: request.userId,
        type: 'plan_decision',
        payload: {
          source: 'agent',
          pathId: path.id,
          decision: decision.action,
          lessonId: decision.lessonId,
          ...(decision.alternativeLessonId ? { alternativeLessonId: decision.alternativeLessonId } : {}),
          reason: decision.reason,
          evidenceKey: decision.evidenceKey,
          consecutiveFailures: decision.consecutiveFailures,
          ...(decision.lastPercent !== undefined ? { lastPercent: decision.lastPercent } : {}),
          ...(explanation ? { explanation } : {}),
        },
        occurredAt: clock.now(),
      }),
    );
    return { ...view, ...(explanation ? { explanation } : {}), isNew: true };
  }

  /** قرارات الوكيل السابقة لهذا المتعلم في المسار، الأحدث أولًا */
  async history(request: { userId: string; pathId: PathId; limit?: number }): Promise<AgentDecisionRecord[]> {
    const observed = await this.deps.events.listByUser(request.userId, ['plan_decision']);
    return this.agentRecords(observed, request.pathId)
      .reverse()
      .slice(0, request.limit ?? 5)
      .map((r) => ({
        action: r.action,
        lessonId: r.lessonId,
        reason: r.reason,
        decidedAt: r.decidedAt,
        ...(r.explanation ? { explanation: r.explanation } : {}),
      }));
  }

  private agentRecords(observed: readonly LearningEvent[], pathId: string) {
    return observed
      .map(toRecord)
      .filter((r): r is NonNullable<typeof r> => r !== null && r.pathId === pathId)
      .sort((a, b) => a.decidedAt.getTime() - b.decidedAt.getTime());
  }

  /** صياغة الشرح فقط؛ أي فشل (غياب النموذج، خطأ، ردّ مخالف للمخطط) يعني بلا شرح، لا خطأ */
  private async explain(view: Pick<AgentAdvice, 'decision' | 'lessonTitle' | 'alternativeLessonTitle'>) {
    const llm = this.deps.llm;
    if (!llm) return null;
    try {
      const raw = await llm.generateJson({
        system:
          'أنت مساعد تعليمي. اكتب بالعربية شرحًا موجزًا (جملتان إلى ثلاث) لمتعلم يوضح لماذا اتُّخذ هذا القرار وماذا يفعل الآن، ' +
          'بنبرة داعمة. اعتمد على الأدلة المعطاة فقط، ولا تضف معلومات عن محتوى الدرس ولا تغيّر القرار ولا تذكر نسبًا غير واردة.',
        user: JSON.stringify({
          القرار: view.decision.action,
          الدرس: view.lessonTitle,
          الدرس_البديل: view.alternativeLessonTitle ?? null,
          عدد_مرات_الفشل_المتتالية: view.decision.consecutiveFailures,
          آخر_نسبة: view.decision.lastPercent ?? null,
          السبب: view.decision.reason,
        }),
        schema: DECISION_EXPLANATION_SCHEMA,
      });
      return parseDecisionExplanation(raw);
    } catch {
      return null;
    }
  }
}
