/**
 * @file personal-plan.usecases.ts
 * @description التعارف والخطة الشخصية: المتعلم يصف شغفه ومجاله، فيختار الذكاء الاصطناعي المسار الأنسب من دروس
 * المنصة (لا يخترع محتوى ولا مصادر من خارجها)، ثم بعد الاختبار التشخيصي تُبنى خطة أسبوعية من الدروس المتبقية.
 * التوزيع على الأسابيع حتمي في Domain؛ النموذج يختار المسار ويكتب عناوين الأسابيع وأسبابها فقط، وكل ما يعيده
 * يُتحقق منه بمخطط قبل استعماله، وعند فشله تعمل الخطة بقواعد بسيطة وتبقى سليمة.
 * الهدف والخطة يُسجَّلان كأحداث (`goal_set` / `plan_created`) فيبقى تاريخ كامل لكل تغيير يُعرض للمتعلم.
 */

import {
  LearningEvent,
  MAX_HOURS_PER_WEEK,
  MIN_HOURS_PER_WEEK,
  buildPlanDays,
  buildPlanWeeks,
  calculatePathProgress,
  createPathId,
  estimateLessonMinutes,
  normalizePlanArrangement,
  type LearningPath,
} from '@qalam/domain';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';
import type { EventReaderPort } from '../ports/event-reader.port.js';
import type { ConceptRepositoryPort } from '../ports/concept-repository.port.js';
import type { LlmClient } from '../ports/llm-client.port.js';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

export const LEARNER_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type LearnerLevel = (typeof LEARNER_LEVELS)[number];

export interface PersonalPlanDeps {
  paths: PathRepositoryPort;
  events: EventRecorderPort & EventReaderPort;
  clock: ClockPort;
  /** اختياري: بدونه تعمل الخطة بالقواعد وحدها */
  llm?: LlmClient;
  /** اختياري: أسماء المفاهيم في عرض الخطة وتعديلها */
  concepts?: ConceptRepositoryPort;
}

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback);

// ───── اختيار المسار من وصف المتعلم ─────

const PICK_PATH_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['pathId', 'rationale'],
  properties: { pathId: { type: 'string' }, rationale: { type: 'string' } },
};

const PICK_PATH_SYSTEM = `أنت مرشد تعليمي عربي. يصف لك متعلم شغفه والمجال الذي يريده بدقة ومستواه.
اختر من «قائمة المسارات المتاحة» المسار الأنسب له فقط، وانسخ معرّفه كما هو حرفيًا في pathId.
لا تخترع مسارًا ولا مصدرًا من خارج القائمة. إن لم يطابق أي مسار تمامًا فاختر الأقرب وقل ذلك بصدق.
rationale: جملتان أو ثلاث بالعربية موجّهتان للمتعلم بصيغة المخاطب، تشرحان لماذا هذا المسار يناسب شغفه ومجاله ومستواه.
نص عادي فقط بلا Markdown.`;

function tokens(text: string): string[] {
  return text
    .split(/[\s,.،؛:!?؟()«»"'\-_/]+/u)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
}

/** اختيار احتياطي بلا نموذج: أكثر مسار تتقاطع كلماته مع وصف المتعلم */
export function pickPathByKeywords(paths: readonly LearningPath[], text: string): LearningPath {
  const wanted = new Set(tokens(text));
  const score = (path: LearningPath) => {
    const haystack = [path.title, path.description, path.targetGoal, path.subject, ...path.modules.flatMap((m) => m.lessons.map((l) => l.title))].join(' ');
    return tokens(haystack).filter((t) => wanted.has(t)).length;
  };
  return paths.reduce((best, path) => (score(path) > score(best) ? path : best), paths[0] as LearningPath);
}

export interface StartOnboardingRequest {
  userId: string;
  /** ما الذي يشغفه (نص حرّ) */
  interest: string;
  /** المجال الذي يريده بالضبط */
  field: string;
  level: LearnerLevel;
  hoursPerWeek: number;
}

export interface StartOnboardingResult {
  pathId: string;
  pathTitle: string;
  rationale: string;
  /** هل اختاره النموذج (وإلا اختير بالكلمات المفتاحية) */
  usedAi: boolean;
}

export class StartOnboardingUseCase {
  constructor(private readonly deps: PersonalPlanDeps) {}

  async execute(request: StartOnboardingRequest): Promise<StartOnboardingResult> {
    const interest = request.interest.trim();
    const field = request.field.trim();
    if (!interest || !field) throw new Error('اكتب ما يشغفك والمجال الذي تريده بالضبط');
    if (!LEARNER_LEVELS.includes(request.level)) throw new Error('اختر مستواك الحالي');
    buildPlanWeeks([], request.hoursPerWeek); // يتحقق من نطاق الساعات برسالة عربية

    const paths = (await this.deps.paths.findAll()).filter((p) => p.modules.some((m) => m.lessons.length > 0));
    if (paths.length === 0) throw new Error('لا توجد مسارات بدروس بعد. حاول لاحقًا');

    const chosen = await this.choose(paths, { interest, field, level: request.level });
    await this.deps.events.record(
      new LearningEvent({
        userId: request.userId,
        type: 'goal_set',
        payload: {
          interest,
          field,
          level: request.level,
          hoursPerWeek: request.hoursPerWeek,
          pathId: chosen.path.id,
          rationale: chosen.rationale,
          usedAi: chosen.usedAi,
        },
        occurredAt: this.deps.clock.now(),
      }),
    );
    return { pathId: chosen.path.id, pathTitle: chosen.path.title, rationale: chosen.rationale, usedAi: chosen.usedAi };
  }

  private async choose(
    paths: LearningPath[],
    goal: { interest: string; field: string; level: string },
  ): Promise<{ path: LearningPath; rationale: string; usedAi: boolean }> {
    const fallback = () => ({
      path: pickPathByKeywords(paths, `${goal.interest} ${goal.field}`),
      rationale: '',
      usedAi: false,
    });
    // مسار وحيد: لا اختيار يُجرى، فلا ننتظر النموذج (قد يستغرق دقيقة) ولا فائدة منه
    if (paths.length === 1 || !this.deps.llm) return withDefaultRationale(fallback());

    try {
      const raw = (await this.deps.llm.generateJson({
        system: PICK_PATH_SYSTEM,
        schema: PICK_PATH_SCHEMA,
        user: [
          `ما يشغفه: ${goal.interest}`,
          `المجال المطلوب بالضبط: ${goal.field}`,
          `مستواه: ${goal.level}`,
          '',
          'قائمة المسارات المتاحة:',
          ...paths.map((p) => `- pathId=${p.id} | ${p.title} | ${p.description} | الهدف: ${p.targetGoal}`),
        ].join('\n'),
      })) as { pathId?: unknown; rationale?: unknown } | null;
      const path = paths.find((p) => p.id === raw?.pathId);
      const rationale = str(raw?.rationale).trim();
      if (!path || !rationale) return withDefaultRationale(fallback());
      return { path, rationale, usedAi: true };
    } catch {
      return withDefaultRationale(fallback());
    }
  }
}

function withDefaultRationale(choice: { path: LearningPath; rationale: string; usedAi: boolean }) {
  return {
    ...choice,
    rationale: `اخترنا لك «${choice.path.title}» لأنه الأقرب لمجالك بين مسارات المنصة الحالية.`,
  };
}

// ───── بناء الخطة ─────

const WEEK_LABELS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'weeks'],
  properties: {
    summary: { type: 'string' },
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['week', 'title', 'focus'],
        properties: { week: { type: 'integer' }, title: { type: 'string' }, focus: { type: 'string' } },
      },
    },
  },
};

const WEEK_LABELS_SYSTEM = `أنت مخطط دراسة عربي. أُعطيتَ هدف متعلم وأسابيع خطته بدروسها (مرتبة، لا تغيّرها).
اكتب لكل أسبوع title قصيرًا (3-6 كلمات) وfocus جملة أو جملتين تشرحان لماذا هذه الدروس في هذا الأسبوع وماذا سيحقق المتعلم منها، بصيغة المخاطب.
summary: جملتان تلخصان الخطة كلها وعلاقتها بهدفه.
استند إلى عناوين الدروس المعطاة فقط ولا تضف دروسًا أو معلومات من خارجها. نص عادي بلا Markdown.`;

export interface PlanWeekView {
  week: number;
  title: string;
  focus: string;
  minutes: number;
  lessons: Array<{ id: string; title: string; status: 'done' | 'skipped' | 'next' | 'upcoming' }>;
  /** تقسيم الأسبوع على أيام الدراسة (مشتق من دروسه وساعات المتعلم) */
  days: Array<{ day: number; minutes: number; lessons: PlanWeekView['lessons'] }>;
}

function latest(events: readonly LearningEvent[], type: LearningEvent['type']): LearningEvent | undefined {
  return events.filter((e) => e.type === type).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
}

export class BuildPersonalPlanUseCase {
  constructor(private readonly deps: PersonalPlanDeps) {}

  /**
   * يبني خطة جديدة من الدروس المتبقية (بعد التشخيصي والإكمال) ويسجّلها؛ يمكن إعادته لتحديث الخطة.
   * `withAi: false` يبني الخطة فورًا بالقواعد (بلا انتظار النموذج الذي قد يستغرق دقيقة)، ثم يُستدعى
   * ثانيةً بـ`withAi: true` في الخلفية لصياغة عناوين الأسابيع وأسبابها فتحلّ محل الأولى.
   */
  async execute(request: { userId: string; withAi?: boolean }): Promise<{ weeks: number }> {
    const events = await this.deps.events.listByUser(request.userId);
    const goalEvent = latest(events, 'goal_set');
    if (!goalEvent) throw new Error('ابدأ بإخبارنا بما يشغفك وبالمجال الذي تريده');

    const path = await this.deps.paths.findById(createPathId(str(goalEvent.payload['pathId'])));
    if (!path) throw new Error('المسار المختار لم يعد موجودًا. أعد التعارف');

    const progress = calculatePathProgress(path, events);
    const remaining = path.modules
      .flatMap((m) => m.lessons)
      .filter((l) => !progress.completedLessonIds.has(l.id) && !progress.skippedLessonIds.has(l.id));
    const hoursPerWeek = num(goalEvent.payload['hoursPerWeek'], 3);
    const weeks = buildPlanWeeks(
      remaining.map((l) => ({ lessonId: l.id, durationSeconds: l.segment.durationSeconds })),
      hoursPerWeek,
    );
    const titles = new Map(remaining.map((l) => [l.id as string, l.title]));
    const labels = await this.label(goalEvent, path, weeks, titles, request.withAi ?? true);

    await this.deps.events.record(
      new LearningEvent({
        userId: request.userId,
        type: 'plan_created',
        payload: {
          pathId: path.id,
          hoursPerWeek,
          summary: labels.summary,
          usedAi: labels.usedAi,
          skippedByDiagnostic: progress.skippedCount,
          weeks: weeks.map((w) => ({
            week: w.week,
            minutes: w.minutes,
            lessonIds: w.lessonIds,
            title: labels.byWeek.get(w.week)?.title ?? `الأسبوع ${w.week}`,
            focus: labels.byWeek.get(w.week)?.focus ?? w.lessonIds.map((id) => titles.get(id)).join('، '),
          })),
        },
        occurredAt: this.deps.clock.now(),
      }),
    );
    return { weeks: weeks.length };
  }

  private async label(
    goal: LearningEvent,
    path: LearningPath,
    weeks: ReturnType<typeof buildPlanWeeks>,
    titles: ReadonlyMap<string, string>,
    withAi: boolean,
  ) {
    const fallbackSummary = `خطة من ${weeks.length} أسبوع في «${path.title}» مبنية على ساعاتك المتاحة ونتيجة اختبارك.`;
    const none = { summary: fallbackSummary, byWeek: new Map<number, { title: string; focus: string }>(), usedAi: false };
    if (!withAi || !this.deps.llm || weeks.length === 0) return none;

    try {
      const raw = (await this.deps.llm.generateJson({
        system: WEEK_LABELS_SYSTEM,
        schema: WEEK_LABELS_SCHEMA,
        user: [
          `ما يشغفه: ${str(goal.payload['interest'])}`,
          `المجال: ${str(goal.payload['field'])}`,
          `المسار: ${path.title}`,
          '',
          ...weeks.map((w) => `الأسبوع ${w.week}: ${w.lessonIds.map((id) => titles.get(id)).join(' | ')}`),
        ].join('\n'),
      })) as { summary?: unknown; weeks?: unknown } | null;
      if (!raw || !Array.isArray(raw.weeks)) return none;

      const byWeek = new Map<number, { title: string; focus: string }>();
      for (const item of raw.weeks as Array<{ week?: unknown; title?: unknown; focus?: unknown }>) {
        const week = num(item?.week, -1);
        const title = str(item?.title).trim();
        const focus = str(item?.focus).trim();
        if (weeks.some((w) => w.week === week) && title && focus) byWeek.set(week, { title, focus });
      }
      return { summary: str(raw.summary).trim() || fallbackSummary, byWeek, usedAi: byWeek.size > 0 };
    } catch {
      return none;
    }
  }
}

// ───── تعديل الخطة بعد إنشائها: بالمحادثة أو يدويًا ─────
// نطاق الخطة = الدروس الموجودة في أسابيعها (مختارة من دروس المسار المتبقية)؛ ما ليس فيها «خارج الخطة».
// البناء التلقائي («حدّث خطتي») يعيد كل المتبقي، والتعديل يمكنه إضافة دروس أو حذفها أو تغيير المسار والساعات.

interface DraftWeek {
  title: string;
  focus: string;
  lessonIds: string[];
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_TITLE_LENGTH = 80;
const MAX_FOCUS_LENGTH = 300;

const makeWeek = (lessonIds: string[]): DraftWeek => ({ title: '', focus: '', lessonIds });

/** الحالة التي يُبنى عليها أي تعديل: الهدف والمسار والدروس المتبقية والمختارة في الخطة والأسابيع الحالية */
async function loadWorkingPlan(deps: Pick<PersonalPlanDeps, 'paths' | 'events'>, userId: string) {
  const events = await deps.events.listByUser(userId);
  const goalEvent = latest(events, 'goal_set');
  if (!goalEvent) throw new Error('ابدأ بإخبارنا بما يشغفك وبالمجال الذي تريده');
  const path = await deps.paths.findById(createPathId(str(goalEvent.payload['pathId'])));
  if (!path) throw new Error('المسار المختار لم يعد موجودًا. أعد التعارف');

  const progress = calculatePathProgress(path, events);
  const remaining = path.modules
    .flatMap((m) => m.lessons)
    .filter((l) => !progress.completedLessonIds.has(l.id) && !progress.skippedLessonIds.has(l.id));
  const remainingIds = remaining.map((l) => l.id as string);
  const hoursPerWeek = num(goalEvent.payload['hoursPerWeek'], 3);

  const planEvent = latest(events, 'plan_created');
  const stored: DraftWeek[] | null =
    planEvent && planEvent.payload['pathId'] === path.id && Array.isArray(planEvent.payload['weeks'])
      ? (planEvent.payload['weeks'] as Array<Record<string, unknown>>).map((w) => ({
          title: str(w['title']),
          focus: str(w['focus']),
          lessonIds: Array.isArray(w['lessonIds']) ? (w['lessonIds'] as unknown[]).map((v) => str(v)) : [],
        }))
      : null;
  const storedIds = new Set(stored?.flatMap((w) => w.lessonIds) ?? []);
  const inPlan = remainingIds.filter((id) => storedIds.has(id));
  // لا خطة سابقة (أو لم يبقَ من دروسها شيء): كل المتبقي
  const selectedIds = inPlan.length > 0 ? inPlan : remainingIds;
  const fresh = (): DraftWeek[] =>
    buildPlanWeeks(
      remaining.filter((l) => selectedIds.includes(l.id)).map((l) => ({ lessonId: l.id, durationSeconds: l.segment.durationSeconds })),
      hoursPerWeek,
    ).map((w) => ({ title: `الأسبوع ${w.week}`, focus: '', lessonIds: w.lessonIds }));
  const current = normalizePlanArrangement(selectedIds, inPlan.length > 0 && stored ? stored : fresh(), makeWeek);
  return { events, goalEvent, path, remaining, remainingIds, selectedIds, hoursPerWeek, current, skippedCount: progress.skippedCount, summary: str(planEvent?.payload['summary']) };
}

type WorkingPlan = Awaited<ReturnType<typeof loadWorkingPlan>>;

/** يسجّل الخطة المعدّلة كحدث `plan_created` جديد (آخر حدث هو الخطة الحالية) مع أثر التعديل لعرضه في السجل */
async function recordRevisedPlan(
  deps: Pick<PersonalPlanDeps, 'events' | 'clock'>,
  userId: string,
  state: WorkingPlan,
  weeks: DraftWeek[],
  summary: string,
  revision: { source: 'chat' | 'manual'; request: string; reply: string; changed: boolean },
): Promise<void> {
  const lessons = new Map(state.remaining.map((l) => [l.id as string, l]));
  await deps.events.record(
    new LearningEvent({
      userId,
      type: 'plan_created',
      payload: {
        pathId: state.path.id,
        hoursPerWeek: state.hoursPerWeek,
        summary,
        usedAi: revision.source === 'chat' && revision.changed,
        skippedByDiagnostic: state.skippedCount,
        revision,
        weeks: weeks.map((w, i) => ({
          week: i + 1,
          minutes: w.lessonIds.reduce((sum, id) => sum + estimateLessonMinutes(lessons.get(id)?.segment.durationSeconds ?? 0), 0),
          lessonIds: w.lessonIds,
          title: w.title.trim() || `الأسبوع ${i + 1}`,
          focus: w.focus.trim() || w.lessonIds.map((id) => lessons.get(id)?.title ?? '').join('، '),
        })),
      },
      occurredAt: deps.clock.now(),
    }),
  );
}

/** أسابيع بالقواعد وحدها من دروس مختارة (للتوزيع التلقائي وعند تغيير المسار) */
function rulesWeeks(state: WorkingPlan, ids: readonly string[], hoursPerWeek: number): DraftWeek[] {
  const wanted = new Set(ids);
  return buildPlanWeeks(
    state.remaining.filter((l) => wanted.has(l.id)).map((l) => ({ lessonId: l.id, durationSeconds: l.segment.durationSeconds })),
    hoursPerWeek,
  ).map((w) => makeWeek(w.lessonIds));
}

const signature = (weeks: readonly DraftWeek[]) => JSON.stringify(weeks.map((w) => [w.title.trim(), w.focus.trim(), w.lessonIds]));

const REVISE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'changed', 'hoursPerWeek', 'pathId', 'weeks'],
  properties: {
    reply: { type: 'string' },
    changed: { type: 'boolean' },
    hoursPerWeek: { type: 'integer' },
    pathId: { type: 'string' },
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'focus', 'lessonIds'],
        properties: { title: { type: 'string' }, focus: { type: 'string' }, lessonIds: { type: 'array', items: { type: 'string' } } },
      },
    },
  },
};

const REVISE_SYSTEM = `أنت مخطط دراسة عربي يعدّل خطة متعلم قائمة بناءً على طلبه، وتغييراتك تُطبَّق فعليًا.
تُعطى: المسار الحالي بكورساته ومفاهيمه ودروسه (معرّف | عنوان | دقائق | في الخطة أو خارجها)، والأسابيع الحالية، وساعاته الأسبوعية، ومسارات أخرى متاحة، وطلبه.
ما يمكنك فعله:
- نقل الدروس بين الأسابيع وإعادة ترتيبها ودمج الأسابيع أو تقسيمها وتغيير عناوينها وأسبابها.
- إضافة دروس «خارج الخطة» إليها أو حذف دروس منها، بما يطلبه (درس بعينه، أو كورس كامل، أو مفهوم كامل).
- تغيير الساعات الأسبوعية: ضع الرقم (1 إلى 40) في hoursPerWeek ووزّع الدروس على أسابيع تناسبه (سعة الأسبوع = الساعات × 60 دقيقة)، وإلا ضع 0.
- تغيير المسار كله إلى واحد من «المسارات الأخرى»: ضع معرّفه حرفيًا في pathId (وإلا اتركه فارغًا). عندها تُبنى الخطة من دروس المسار الجديد تلقائيًا ويُهمل weeks.
القواعد:
- weeks هي الخطة الجديدة كاملة: كل درس لا تذكره فيها يخرج من الخطة، فلا تحذف إلا ما طلبه المتعلم حذفه. لا تذكر درسًا مرتين.
- استعمل معرّفات الدروس المعطاة حرفيًا ولا تخترع دروسًا أو مسارات.
- احترم التسلسل المنطقي للمتطلبات السابقة ما لم يطلب غيره.
- title عنوان قصير (3-6 كلمات) وfocus جملة أو جملتان بصيغة المخاطب تشرحان سبب دروس الأسبوع.
- reply: ردّ موجز بالعربية بصيغة المخاطب يوضح ما غيّرته ولماذا، أو يجيب عن سؤاله.
- إن لم يكن الطلب تعديلًا (سؤال أو استيضاح) أو تعذّر بالدروس المتاحة فضع changed=false واشرح، وأعد الأسابيع الحالية كما هي.
نص عادي بلا Markdown.`;

export class RevisePersonalPlanUseCase {
  constructor(private readonly deps: PersonalPlanDeps) {}

  /** المتعلم يطلب تعديل خطته بالمحادثة؛ الذكاء الاصطناعي يقترح، والدومين يصحّح، ويُحكم على «تغيّرت فعلًا» بمقارنة النتيجة */
  async execute(request: { userId: string; message: string }): Promise<{ reply: string; changed: boolean; newPathId: string | null }> {
    const message = request.message.trim();
    if (!message) throw new Error('اكتب ما تريد تعديله في خطتك');
    if (message.length > MAX_MESSAGE_LENGTH) throw new Error(`الرسالة طويلة؛ اختصرها إلى ${MAX_MESSAGE_LENGTH} حرف أو أقل`);
    if (!this.deps.llm) throw new Error('المساعد غير متاح الآن. يمكنك تعديل خطتك يدويًا');

    const state = await loadWorkingPlan(this.deps, request.userId);
    if (state.remaining.length === 0) throw new Error('أنهيت كل دروس المسار، فلا شيء لتعديله في الخطة');
    const otherPaths = (await this.deps.paths.findAll()).filter((p) => p.id !== state.path.id && p.modules.some((m) => m.lessons.length > 0));
    const conceptNames = await conceptNameMap(this.deps.concepts, state.path);

    const lessons = new Map(state.remaining.map((l) => [l.id as string, l]));
    const inPlan = new Set(state.selectedIds);
    const recent = state.events
      .filter((e) => e.type === 'plan_created' && isRecord(e.payload['revision']) && e.payload['revision']['source'] === 'chat')
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(-3)
      .flatMap((e) => {
        const r = e.payload['revision'] as Record<string, unknown>;
        return [`المتعلم: ${str(r['request'])}`, `أنت: ${str(r['reply'])}`];
      });

    let raw: { reply?: unknown; changed?: unknown; hoursPerWeek?: unknown; pathId?: unknown; weeks?: unknown } | null;
    try {
      raw = (await this.deps.llm.generateJson({
        system: REVISE_SYSTEM,
        schema: REVISE_SCHEMA,
        user: [
          `هدفه: ${str(state.goalEvent.payload['field'])} (${str(state.goalEvent.payload['interest'])})`,
          `المسار الحالي: ${state.path.title}`,
          `ساعاته الأسبوعية: ${state.hoursPerWeek} (= ${state.hoursPerWeek * 60} دقيقة)`,
          '',
          'دروس المسار المتبقية (غير المنجزة) بحسب الكورس والمفهوم:',
          ...state.path.courses.flatMap((c) => {
            const rows = c.modules.flatMap((m) => m.lessons).filter((l) => lessons.has(l.id));
            return rows.length === 0
              ? []
              : [
                  `كورس «${c.title}» (مفهوم: ${conceptNames.get(c.conceptId) ?? '—'}):`,
                  ...rows.map((l) => `  ${l.id} | ${l.title} | ${estimateLessonMinutes(l.segment.durationSeconds)} دقيقة | ${inPlan.has(l.id) ? 'في الخطة' : 'خارج الخطة'}`),
                ];
          }),
          '',
          'الأسابيع الحالية:',
          ...state.current.map((w, i) => `الأسبوع ${i + 1} «${w.title}»: ${w.lessonIds.join(', ')}`),
          '',
          ...(otherPaths.length > 0 ? ['مسارات أخرى متاحة:', ...otherPaths.map((p) => `- pathId=${p.id} | ${p.title} | ${p.description}`), ''] : []),
          ...(recent.length > 0 ? ['آخر ما دار بينكما:', ...recent, ''] : []),
          `طلبه الآن: ${message}`,
        ].join('\n'),
      })) as typeof raw;
    } catch {
      throw new Error('تعذّر الوصول إلى المساعد الآن. حاول بعد قليل أو عدّل خطتك يدويًا');
    }

    let reply = str(raw?.reply).trim() || 'تعذّر فهم الطلب، أعد صياغته من فضلك.';
    const claimed = raw?.changed === true;
    const proposed: DraftWeek[] = Array.isArray(raw?.weeks)
      ? (raw.weeks as Array<Record<string, unknown>>).map((w) => ({
          title: str(w?.['title']).trim().slice(0, MAX_TITLE_LENGTH),
          focus: str(w?.['focus']).trim().slice(0, MAX_FOCUS_LENGTH),
          lessonIds: Array.isArray(w?.['lessonIds']) ? (w['lessonIds'] as unknown[]).map((v) => str(v)) : [],
        }))
      : [];

    const hours = num(raw?.hoursPerWeek, 0);
    const newHours = claimed && Number.isInteger(hours) && hours >= MIN_HOURS_PER_WEEK && hours <= MAX_HOURS_PER_WEEK && hours !== state.hoursPerWeek ? hours : null;
    const newPath = claimed ? otherPaths.find((p) => p.id === raw?.pathId) : undefined;

    // 1) هدف جديد (مسار و/أو ساعات) يُسجَّل قبل الخطة، وآخر هدف هو الحالي
    if (newHours !== null || newPath) {
      await this.deps.events.record(
        new LearningEvent({
          userId: request.userId,
          type: 'goal_set',
          payload: {
            ...state.goalEvent.payload,
            ...(newHours !== null ? { hoursPerWeek: newHours } : {}),
            ...(newPath ? { pathId: newPath.id, rationale: `انتقلتَ إلى «${newPath.title}» بطلبك.` } : {}),
          },
          occurredAt: this.deps.clock.now(),
        }),
      );
    }

    // 2) الأسابيع الجديدة: مسار جديد بالقواعد، وإلا اقتراح النموذج مصحَّحًا على دروس المسار
    let target = state;
    let weeks: DraftWeek[];
    let summary = state.summary;
    if (newPath) {
      target = await loadWorkingPlan(this.deps, request.userId);
      weeks = rulesWeeks(target, target.remainingIds, target.hoursPerWeek);
      summary = `خطة من ${weeks.length} أسبوع في «${newPath.title}» مبنية على ساعاتك المتاحة.`;
    } else {
      const mentioned = new Set(proposed.flatMap((w) => w.lessonIds));
      const selection = state.remainingIds.filter((id) => mentioned.has(id));
      weeks = claimed && selection.length > 0 ? normalizePlanArrangement(selection, proposed, makeWeek) : state.current;
      if (newHours !== null) target = { ...state, hoursPerWeek: newHours };
    }

    // 3) هل تغيّرت الخطة فعلًا؟ لا نصدّق «changed» وحدها
    const actuallyChanged = newPath !== undefined || newHours !== null || signature(weeks) !== signature(state.current);
    if (claimed && !actuallyChanged) reply += '\n(لم يتغير شيء فعليًا في الخطة. جرّب صياغة أوضح، أو عدّلها يدويًا.)';
    if (actuallyChanged) {
      const count = weeks.reduce((n, w) => n + w.lessonIds.length, 0);
      reply += `\nالخطة الآن: ${weeks.length} أسبوع و${count} درسًا${newPath ? ` في «${newPath.title}»` : ''}.`;
    }
    await recordRevisedPlan(this.deps, request.userId, target, weeks, summary, { source: 'chat', request: message, reply, changed: actuallyChanged });
    return { reply, changed: actuallyChanged, newPathId: newPath ? newPath.id : null };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function conceptNameMap(concepts: PersonalPlanDeps['concepts'], path: LearningPath): Promise<Map<string, string>> {
  if (!concepts) return new Map();
  const list = await concepts.findByPath(path.id).catch(() => []);
  return new Map(list.map((c) => [c.id as string, c.name]));
}

export interface EditPlanRequest {
  userId: string;
  /** الدروس المختارة في الخطة (الأخرى تخرج منها)؛ بدونها تبقى الخطة على اختيارها الحالي */
  includeLessonIds?: string[];
  /** الساعات الأسبوعية الجديدة؛ بدونها تبقى كما هي */
  hoursPerWeek?: number;
  /** وزّع المختار على الأسابيع تلقائيًا بحسب الساعات بدل التوزيع اليدوي */
  redistribute?: boolean;
  weeks: DraftWeek[];
}

export class EditPersonalPlanUseCase {
  constructor(private readonly deps: Pick<PersonalPlanDeps, 'paths' | 'events' | 'clock'>) {}

  /** تعديل يدوي شامل: الدروس المشمولة (كورسات ومفاهيم)، الساعات، التوزيع، وعناوين الأسابيع وأسبابها */
  async execute(request: EditPlanRequest): Promise<{ weeks: number; lessons: number }> {
    const state = await loadWorkingPlan(this.deps, request.userId);
    if (state.remaining.length === 0) throw new Error('أنهيت كل دروس المسار، فلا شيء لتعديله في الخطة');
    for (const w of request.weeks) {
      if (w.title.length > MAX_TITLE_LENGTH) throw new Error(`عنوان الأسبوع طويل؛ الحد ${MAX_TITLE_LENGTH} حرفًا`);
      if (w.focus.length > MAX_FOCUS_LENGTH) throw new Error(`وصف الأسبوع طويل؛ الحد ${MAX_FOCUS_LENGTH} حرفًا`);
    }

    const include = request.includeLessonIds ? new Set(request.includeLessonIds) : null;
    const selectedIds = include ? state.remainingIds.filter((id) => include.has(id)) : state.selectedIds;
    if (selectedIds.length === 0) throw new Error('اختر درسًا واحدًا على الأقل في خطتك');

    const hours = request.hoursPerWeek ?? state.hoursPerWeek;
    buildPlanWeeks([], hours); // يتحقق من نطاق الساعات برسالة عربية
    if (hours !== state.hoursPerWeek) {
      await this.deps.events.record(
        new LearningEvent({ userId: request.userId, type: 'goal_set', payload: { ...state.goalEvent.payload, hoursPerWeek: hours }, occurredAt: this.deps.clock.now() }),
      );
    }

    const weeks = request.redistribute
      ? rulesWeeks(state, selectedIds, hours)
      : normalizePlanArrangement(selectedIds, request.weeks, makeWeek);
    await recordRevisedPlan(this.deps, request.userId, { ...state, hoursPerWeek: hours }, weeks, state.summary, { source: 'manual', request: '', reply: '', changed: true });
    return { weeks: weeks.length, lessons: selectedIds.length };
  }
}

export class ChangePlanPathUseCase {
  constructor(private readonly deps: PersonalPlanDeps) {}

  /** يغيّر المسار المراد تعلّمه ويبني خطته من دروسه المتبقية فورًا بالقواعد (الصياغة بالذكاء الاصطناعي لاحقًا) */
  async execute(request: { userId: string; pathId: string }): Promise<{ pathId: string; pathTitle: string }> {
    const events = await this.deps.events.listByUser(request.userId);
    const goalEvent = latest(events, 'goal_set');
    if (!goalEvent) throw new Error('ابدأ بإخبارنا بما يشغفك وبالمجال الذي تريده');
    if (goalEvent.payload['pathId'] === request.pathId) throw new Error('هذا هو مسارك الحالي');
    const path = await this.deps.paths.findById(createPathId(request.pathId));
    if (!path || !path.modules.some((m) => m.lessons.length > 0)) throw new Error('المسار المطلوب غير متاح');

    await this.deps.events.record(
      new LearningEvent({
        userId: request.userId,
        type: 'goal_set',
        payload: { ...goalEvent.payload, pathId: path.id, rationale: `اخترتَ «${path.title}» بنفسك.`, usedAi: false },
        occurredAt: this.deps.clock.now(),
      }),
    );
    await new BuildPersonalPlanUseCase(this.deps).execute({ userId: request.userId, withAi: false });
    return { pathId: path.id, pathTitle: path.title };
  }
}

// ───── عرض الخطة والسجل ─────

export interface PersonalPlanView {
  goal: {
    interest: string;
    field: string;
    level: string;
    hoursPerWeek: number;
    pathId: string;
    pathTitle: string;
    rationale: string;
  };
  plan: null | {
    summary: string;
    createdAt: Date;
    usedAi: boolean;
    weeks: PlanWeekView[];
    /** خطة اليوم: أول يوم فيه درس لم يُنجز بعد (null إذا أُنجزت الخطة كلها) */
    today: null | { week: number; day: number; minutes: number; lessons: PlanWeekView['lessons'] };
  };
  progress: { percent: number; completedCount: number; skippedCount: number; totalCount: number };
  next: { id: string; title: string } | null;
  /** سجل ما درسه المتعلم بترتيب الإكمال */
  history: Array<{ lessonId: string; title: string; at: Date }>;
  /** محادثة تعديل الخطة وتعديلاتها اليدوية (الأقدم أولًا، آخر 12) */
  revisions: Array<{ kind: 'chat' | 'manual'; request: string; reply: string; changed: boolean; at: Date }>;
  /** ما يحتاجه تعديل الخطة يدويًا: المسارات المتاحة، وكورسات المسار الحالي بمفاهيمها ودروسها وحالة كل درس */
  catalog: {
    paths: Array<{ id: string; title: string }>;
    courses: Array<{
      id: string;
      title: string;
      conceptName: string;
      lessons: Array<{ id: string; title: string; minutes: number; state: 'done' | 'skipped' | 'in' | 'out' }>;
    }>;
  };
}

export class GetPersonalPlanUseCase {
  constructor(private readonly deps: Pick<PersonalPlanDeps, 'paths' | 'events' | 'concepts'>) {}

  /** null إذا لم يُجرِ المتعلم التعارف بعد */
  async execute(request: { userId: string }): Promise<PersonalPlanView | null> {
    const events = await this.deps.events.listByUser(request.userId);
    const goalEvent = latest(events, 'goal_set');
    if (!goalEvent) return null;

    const path = await this.deps.paths.findById(createPathId(str(goalEvent.payload['pathId'])));
    if (!path) return null;
    const progress = calculatePathProgress(path, events);
    const lessons = new Map(path.modules.flatMap((m) => m.lessons).map((l) => [l.id as string, l]));

    const planEvent = latest(events, 'plan_created');
    const planned =
      planEvent && planEvent.payload['pathId'] === path.id && Array.isArray(planEvent.payload['weeks'])
        ? (planEvent.payload['weeks'] as Array<Record<string, unknown>>)
        : null;

    const statusOf = (id: string): PlanWeekView['lessons'][number]['status'] =>
      progress.completedLessonIds.has(id) ? 'done' : progress.skippedLessonIds.has(id) ? 'skipped' : progress.nextLesson?.id === id ? 'next' : 'upcoming';

    const history = events
      .filter((e) => e.type === 'lesson_completed')
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .flatMap((e) => {
        const lesson = lessons.get(str(e.payload['lessonId']));
        return lesson ? [{ lessonId: lesson.id as string, title: lesson.title, at: e.occurredAt }] : [];
      });

    const plannedIds = new Set(planned?.flatMap((w) => (Array.isArray(w['lessonIds']) ? (w['lessonIds'] as unknown[]).map((v) => str(v)) : [])) ?? []);
    const conceptNames = await conceptNameMap(this.deps.concepts, path);
    const allPaths = (await this.deps.paths.findAll()).filter((p) => p.modules.some((m) => m.lessons.length > 0));

    const hoursPerWeek = num(goalEvent.payload['hoursPerWeek'], 3);
    const weekViews: PlanWeekView[] = (planned ?? []).map((w) => {
      const weekLessons = (Array.isArray(w['lessonIds']) ? (w['lessonIds'] as unknown[]) : [])
        .map((v) => str(v))
        .filter((id) => lessons.has(id))
        .map((id) => ({ id, title: lessons.get(id)?.title ?? '', status: statusOf(id) }));
      const days = buildPlanDays(
        weekLessons.map((l) => ({ lessonId: l.id, durationSeconds: lessons.get(l.id)?.segment.durationSeconds ?? 0 })),
        hoursPerWeek,
      ).map((d) => ({
        day: d.day,
        minutes: d.minutes,
        lessons: d.lessonIds.map((id) => weekLessons.find((l) => l.id === id) as PlanWeekView['lessons'][number]),
      }));
      return { week: num(w['week']), title: str(w['title']), focus: str(w['focus']), minutes: num(w['minutes']), lessons: weekLessons, days };
    });
    const isOpen = (s: PlanWeekView['lessons'][number]['status']) => s === 'next' || s === 'upcoming';
    let today: NonNullable<PersonalPlanView['plan']>['today'] = null;
    for (const week of weekViews) {
      const day = week.days.find((d) => d.lessons.some((l) => isOpen(l.status)));
      if (day) {
        today = { week: week.week, day: day.day, minutes: day.minutes, lessons: day.lessons };
        break;
      }
    }

    return {
      catalog: {
        paths: allPaths.map((p) => ({ id: p.id as string, title: p.title })),
        courses: path.courses.map((c) => ({
          id: c.id as string,
          title: c.title,
          conceptName: conceptNames.get(c.conceptId) ?? '',
          lessons: c.modules
            .flatMap((m) => m.lessons)
            .map((l) => ({
              id: l.id as string,
              title: l.title,
              minutes: estimateLessonMinutes(l.segment.durationSeconds),
              state: progress.completedLessonIds.has(l.id)
                ? ('done' as const)
                : progress.skippedLessonIds.has(l.id)
                  ? ('skipped' as const)
                  : !planned || plannedIds.has(l.id)
                    ? ('in' as const)
                    : ('out' as const),
            })),
        })),
      },
      goal: {
        interest: str(goalEvent.payload['interest']),
        field: str(goalEvent.payload['field']),
        level: str(goalEvent.payload['level']),
        hoursPerWeek: num(goalEvent.payload['hoursPerWeek'], 3),
        pathId: path.id,
        pathTitle: path.title,
        rationale: str(goalEvent.payload['rationale']),
      },
      plan: planned
        ? {
            summary: str(planEvent?.payload['summary']),
            createdAt: (planEvent as LearningEvent).occurredAt,
            usedAi: planEvent?.payload['usedAi'] === true,
            weeks: weekViews,
            today,
          }
        : null,
      progress: {
        percent: progress.percent,
        completedCount: progress.completedCount,
        skippedCount: progress.skippedCount,
        totalCount: progress.totalCount,
      },
      next: progress.nextLesson ? { id: progress.nextLesson.id, title: progress.nextLesson.title } : null,
      history,
      revisions: events
        .filter((e) => e.type === 'plan_created' && e.payload['pathId'] === path.id && isRecord(e.payload['revision']))
        .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
        .slice(-12)
        .map((e) => {
          const r = e.payload['revision'] as Record<string, unknown>;
          return { kind: r['source'] === 'chat' ? ('chat' as const) : ('manual' as const), request: str(r['request']), reply: str(r['reply']), changed: r['changed'] === true, at: e.occurredAt };
        }),
    };
  }
}
