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
  buildPlanWeeks,
  calculatePathProgress,
  createPathId,
  type LearningPath,
} from '@qalam/domain';
import type { ClockPort, EventRecorderPort } from '../ports/event-recorder.port.js';
import type { EventReaderPort } from '../ports/event-reader.port.js';
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
    if (!this.deps.llm) return withDefaultRationale(fallback());

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
}

function latest(events: readonly LearningEvent[], type: LearningEvent['type']): LearningEvent | undefined {
  return events.filter((e) => e.type === type).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
}

export class BuildPersonalPlanUseCase {
  constructor(private readonly deps: PersonalPlanDeps) {}

  /** يبني خطة جديدة من الدروس المتبقية (بعد التشخيصي والإكمال) ويسجّلها؛ يمكن إعادته لتحديث الخطة */
  async execute(request: { userId: string }): Promise<{ weeks: number }> {
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
    const labels = await this.label(goalEvent, path, weeks, titles);

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
  ) {
    const fallbackSummary = `خطة من ${weeks.length} أسبوع في «${path.title}» مبنية على ساعاتك المتاحة ونتيجة اختبارك.`;
    const none = { summary: fallbackSummary, byWeek: new Map<number, { title: string; focus: string }>(), usedAi: false };
    if (!this.deps.llm || weeks.length === 0) return none;

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
  plan: null | { summary: string; createdAt: Date; usedAi: boolean; weeks: PlanWeekView[] };
  progress: { percent: number; completedCount: number; skippedCount: number; totalCount: number };
  next: { id: string; title: string } | null;
  /** سجل ما درسه المتعلم بترتيب الإكمال */
  history: Array<{ lessonId: string; title: string; at: Date }>;
}

export class GetPersonalPlanUseCase {
  constructor(private readonly deps: Pick<PersonalPlanDeps, 'paths' | 'events'>) {}

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

    return {
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
            weeks: planned.map((w) => ({
              week: num(w['week']),
              title: str(w['title']),
              focus: str(w['focus']),
              minutes: num(w['minutes']),
              lessons: (Array.isArray(w['lessonIds']) ? (w['lessonIds'] as unknown[]) : [])
                .map((v) => str(v))
                .filter((id) => lessons.has(id))
                .map((id) => ({ id, title: lessons.get(id)?.title ?? '', status: statusOf(id) })),
            })),
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
    };
  }
}
