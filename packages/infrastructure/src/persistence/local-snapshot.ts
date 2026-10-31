/**
 * @file local-snapshot.ts
 * @description لقطة JSON للمخزن المحلي (وضع التطوير بلا Supabase) كي لا تضيع المسودات والتعديلات
 * عند إعادة تشغيل الخادم. تحويل نقي بين الكيانات وJSON، مع قراءة/كتابة ملف في `FileSnapshotStore`.
 * ليست بديلًا عن قاعدة البيانات في الإنتاج.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  Concept,
  Course,
  LearningEvent,
  LearningPath,
  Lesson,
  Module,
  QuizQuestion,
  VideoSegment,
  createConceptId,
  createCourseId,
  createLessonId,
  createModuleId,
  createPathId,
  createQuestionId,
  type LearningEventType,
} from '@qalam/domain';

export interface LocalSnapshot {
  version: 2;
  paths: unknown[];
  concepts: unknown[];
  questions: unknown[];
  events: unknown[];
}

/** كيانات المخزن كما يراها المصوِّر (مصادر قراءة فقط) */
export interface SnapshotSources {
  paths: readonly LearningPath[];
  concepts: readonly Concept[];
  questions: readonly QuizQuestion[];
  events: readonly LearningEvent[];
}

export interface RestoredSnapshot {
  paths: LearningPath[];
  concepts: Concept[];
  questions: QuizQuestion[];
  events: LearningEvent[];
}

export function takeSnapshot(sources: SnapshotSources): LocalSnapshot {
  return {
    version: 2,
    paths: sources.paths.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      targetGoal: p.targetGoal,
      subject: p.subject,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      courses: p.courses.map((c) => ({
        id: c.id,
        conceptId: c.conceptId,
        title: c.title,
        description: c.description,
        orderIndex: c.orderIndex,
        modules: c.modules.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          orderIndex: m.orderIndex,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            videoId: l.segment.videoId,
            startSeconds: l.segment.startSeconds,
            endSeconds: l.segment.endSeconds,
            sourceUrl: l.sourceUrl,
            channelName: l.channelName,
            language: l.language,
            summary: l.summary,
            reviewedByHuman: l.reviewedByHuman,
            notes: l.notes,
            mediaUrl: l.mediaUrl,
            studyGuide: l.studyGuide,
          })),
        })),
      })),
    })),
    concepts: sources.concepts.map((c) => ({
      id: c.id,
      pathId: c.pathId,
      name: c.name,
      description: c.description,
      level: c.level,
      prerequisiteIds: [...c.prerequisiteIds],
      createdAt: c.createdAt.toISOString(),
    })),
    questions: sources.questions.map((q) => ({
      id: q.id,
      lessonId: q.lessonId,
      conceptId: q.conceptId,
      prompt: q.prompt,
      choices: [...q.choices],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      status: q.status,
      origin: q.origin,
    })),
    events: sources.events.map((e) => ({
      userId: e.userId,
      type: e.type,
      payload: e.payload,
      occurredAt: e.occurredAt.toISOString(),
    })),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- JSON من ملف محلي نعيد بناءه عبر مُنشئات Domain التي تتحقق */
export function restoreSnapshot(snapshot: LocalSnapshot): RestoredSnapshot {
  return {
    paths: snapshot.paths.map((p: any) => {
      const path = new LearningPath({
        id: createPathId(p.id),
        title: p.title,
        description: p.description,
        targetGoal: p.targetGoal,
        subject: p.subject,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      });
      for (const c of p.courses) {
        const course = new Course({
          id: createCourseId(c.id),
          conceptId: createConceptId(c.conceptId),
          title: c.title,
          description: c.description,
          orderIndex: c.orderIndex,
        });
        for (const m of c.modules) {
          const module = new Module({
            id: createModuleId(m.id),
            title: m.title,
            description: m.description,
            orderIndex: m.orderIndex,
          });
          for (const l of m.lessons) {
            module.addLesson(
              new Lesson({
                id: createLessonId(l.id),
                title: l.title,
                segment: new VideoSegment({ videoId: l.videoId, startSeconds: l.startSeconds, endSeconds: l.endSeconds }),
                sourceUrl: l.sourceUrl,
                channelName: l.channelName,
                language: l.language,
                summary: l.summary,
                reviewedByHuman: l.reviewedByHuman,
                notes: l.notes,
                mediaUrl: l.mediaUrl,
                studyGuide: l.studyGuide,
              }),
            );
          }
          course.addModule(module);
        }
        path.addCourse(course);
      }
      return path;
    }),
    concepts: snapshot.concepts.map(
      (c: any) =>
        new Concept({
          id: createConceptId(c.id),
          pathId: createPathId(c.pathId),
          name: c.name,
          description: c.description,
          level: c.level,
          prerequisiteIds: c.prerequisiteIds.map(createConceptId),
          createdAt: new Date(c.createdAt),
        }),
    ),
    questions: snapshot.questions.map(
      (q: any) =>
        new QuizQuestion({
          id: createQuestionId(q.id),
          lessonId: createLessonId(q.lessonId),
          conceptId: createConceptId(q.conceptId),
          prompt: q.prompt,
          choices: q.choices,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          status: q.status,
          origin: q.origin,
        }),
    ),
    events: snapshot.events.map(
      (e: any) =>
        new LearningEvent({
          userId: e.userId,
          type: e.type as LearningEventType,
          payload: e.payload,
          occurredAt: new Date(e.occurredAt),
        }),
    ),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** ملف اللقطة: الكتابة عبر ملف مؤقت ثم إعادة تسمية كي لا يتلف عند انقطاع التشغيل */
export class FileSnapshotStore {
  constructor(private readonly filePath: string) {}

  /** null إذا لم يوجد الملف أو تعذّرت قراءته (فنبدأ من البذرة بدل أن نتوقف) */
  load(): RestoredSnapshot | null {
    if (!existsSync(this.filePath)) return null;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as LocalSnapshot;
      return parsed.version === 2 ? restoreSnapshot(parsed) : null;
    } catch {
      return null;
    }
  }

  save(snapshot: LocalSnapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    writeFileSync(temp, JSON.stringify(snapshot, null, 1), 'utf8');
    renameSync(temp, this.filePath);
  }
}
