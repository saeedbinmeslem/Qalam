/**
 * @file diagnostic.ts
 * @description الاختبار التشخيصي: يقيس ما يعرفه المتعلم قبل البدء ليتخطى ما أتقنه.
 * قاعدة التخطي (من SPEC §7): يُتخطى مفهوم فقط إذا أُجيب **كل** أسئلته التشخيصية صحيحًا، ويلزم سؤالان على
 * الأقل عن المفهوم؛ فسؤال واحد قد يُصاب بالتخمين ولا يكفي دليلًا. التخطي قرار خطة يُسجَّل بسببه.
 */

import type { LearningPath } from '../entities/learning-path.js';
import type { Lesson } from '../entities/lesson.js';
import type { QuizQuestion } from '../entities/quiz-question.js';
import type { ConceptId } from '../value-objects/identifiers.js';
import type { QuizResult } from './quiz-grading.js';

/** أقل عدد أسئلة نسعى إليه في التشخيصي ليكون دليلًا كافيًا على فهم المتعلم (يقلّ فقط إن لم يعتمد المالك ما يكفي) */
export const MIN_DIAGNOSTIC_QUESTIONS = 15;
/** الحد الأدنى من الأسئلة المعتمدة عن المفهوم ليُتخطى بناءً على الاختبار */
export const MIN_EVIDENCE_QUESTIONS = 2;

/**
 * أسئلة التشخيصي: معتمدة فقط، موزعة على كورسات المسار كلها لا على أولها، ولا تقل عن `MIN_DIAGNOSTIC_QUESTIONS` إن توفرت.
 * لكل كورس حصة متساوية (بحد أدنى سؤالان ليتوفر دليل للمفهوم)، تُؤخذ بالتناوب بين دروسه، وما نقص يُكمَل بالتناوب
 * من الكورسات التي بقي فيها أسئلة. الترتيب النهائي بترتيب كورسات المسار ودروسه، والاختيار حتمي (تُعاد الأسئلة نفسها عند التصحيح).
 */
export function selectDiagnosticQuestions(
  path: LearningPath,
  approved: readonly QuizQuestion[],
  target: number = MIN_DIAGNOSTIC_QUESTIONS,
): QuizQuestion[] {
  const eligible = approved.filter((q) => q.isApproved);
  const lessonOrder = new Map(path.modules.flatMap((m) => m.lessons).map((l, i) => [l.id as string, i]));

  // أسئلة كل كورس مرتبة بالتناوب بين دروسه (سؤال من كل درس ثم الجولة التالية)
  const perCourse = path.courses
    .map((course) => {
      const byLesson = course.modules
        .flatMap((m) => m.lessons)
        .map((l) => eligible.filter((q) => q.lessonId === l.id));
      const interleaved: QuizQuestion[] = [];
      for (let round = 0; byLesson.some((qs) => qs[round]); round++) {
        for (const qs of byLesson) if (qs[round]) interleaved.push(qs[round] as QuizQuestion);
      }
      return interleaved;
    })
    .filter((qs) => qs.length > 0);
  if (perCourse.length === 0) return [];

  const quota = Math.max(MIN_EVIDENCE_QUESTIONS, Math.ceil(target / perCourse.length));
  const chosen = new Set<QuizQuestion>();
  for (const qs of perCourse) qs.slice(0, quota).forEach((q) => chosen.add(q));

  // لم نبلغ الهدف (كورسات قليلة الأسئلة): نكمل بالتناوب مما بقي
  for (let round = quota; chosen.size < target && perCourse.some((qs) => qs[round]); round++) {
    for (const qs of perCourse) if (chosen.size < target && qs[round]) chosen.add(qs[round] as QuizQuestion);
  }

  const courseIndex = new Map(perCourse.flatMap((qs, i) => qs.map((q) => [q, i] as const)));
  return [...chosen].sort(
    (a, b) => (courseIndex.get(a) ?? 0) - (courseIndex.get(b) ?? 0) || (lessonOrder.get(a.lessonId) ?? 0) - (lessonOrder.get(b.lessonId) ?? 0),
  );
}

export interface DiagnosticPlan {
  masteredConceptIds: ConceptId[];
  /** الدروس المقترح تخطيها (مفهومها متقَن) مع سبب القرار */
  skips: Array<{ lesson: Lesson; reason: string }>;
}

export function planDiagnosticSkips(
  path: LearningPath,
  questions: readonly QuizQuestion[],
  result: QuizResult,
  conceptNames: ReadonlyMap<string, string> = new Map(),
): DiagnosticPlan {
  const byConcept = new Map<ConceptId, boolean[]>();
  questions.forEach((q, i) => {
    const marks = byConcept.get(q.conceptId) ?? [];
    marks.push(result.results[i]?.isCorrect === true);
    byConcept.set(q.conceptId, marks);
  });

  const mastered = new Set(
    [...byConcept.entries()]
      .filter(([, marks]) => marks.length >= MIN_EVIDENCE_QUESTIONS && marks.every(Boolean))
      .map(([conceptId]) => conceptId),
  );

  const conceptOf = path.lessonConceptMap();
  const skips = path.modules
    .flatMap((m) => m.lessons)
    .filter((lesson) => mastered.has(conceptOf.get(lesson.id) as ConceptId))
    .map((lesson) => {
      const conceptId = conceptOf.get(lesson.id) as ConceptId;
      const name = conceptNames.get(conceptId) ?? 'هذا المفهوم';
      const n = byConcept.get(conceptId)?.length ?? 0;
      const count = n === 2 ? 'سؤالين' : `${n} أسئلة`;
      return { lesson, reason: `أجبتَ صحيحًا على ${count} عن «${name}» في الاختبار التشخيصي` };
    });

  return { masteredConceptIds: [...mastered], skips };
}
