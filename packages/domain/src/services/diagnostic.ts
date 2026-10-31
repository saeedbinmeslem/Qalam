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

export const QUESTIONS_PER_CONCEPT = 2;
/** الحد الأدنى من الأسئلة المعتمدة عن المفهوم ليُتخطى بناءً على الاختبار */
export const MIN_EVIDENCE_QUESTIONS = 2;

/** أسئلة المسار المعتمدة فقط، حتى سؤالين لكل مفهوم، بترتيب ظهور المفاهيم في المسار */
export function selectDiagnosticQuestions(path: LearningPath, approved: readonly QuizQuestion[]): QuizQuestion[] {
  const lessonIds = new Set(path.modules.flatMap((m) => m.lessons.map((l) => l.id as string)));
  const eligible = approved.filter((q) => q.isApproved && lessonIds.has(q.lessonId));

  // مفاهيم المسار بترتيب كورساته
  return path.conceptIds.flatMap((conceptId) =>
    eligible.filter((q) => q.conceptId === conceptId).slice(0, QUESTIONS_PER_CONCEPT),
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
