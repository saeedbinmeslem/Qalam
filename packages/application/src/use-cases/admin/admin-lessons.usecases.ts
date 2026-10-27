/**
 * @file admin-lessons.usecases.ts
 * @description إدارة الدروس. قاعدة الجودة: أي تعديل على محتوى الدرس (الفيديو أو المقطع أو العنوان
 * أو المفهوم أو القناة أو الملخص) يُسقط وسم «مراجعة بشرية»، فلا يبقى درس معتمدًا بعد تغييره.
 * وسم المراجعة نفسه لا يُمنح إلا عبر SetLessonReviewUseCase.
 */

import {
  Lesson,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  parseTimecode,
  parseYouTubeVideoId,
  toWatchUrl,
  type LearningPath,
} from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import { requireAdmin, loadPath, type AdminDeps, type AdminRequest } from './admin-deps.js';

/** حقول الدرس كما تُدخل في النموذج (روابط وتوقيتات نصية) */
export interface LessonFields {
  title: string;
  conceptId: string;
  /** رابط يوتيوب أو معرّف الفيديو */
  videoUrl: string;
  /** «1:23» أو ثوانٍ */
  start: string;
  end: string;
  channelName: string;
  language: string;
  summary: string;
  /** ملاحظات المالك عن المحتوى (أساس توليد الأسئلة؛ لا تُعرض للمتعلم) */
  notes?: string;
}

async function buildLessonChanges(deps: AdminDeps, fields: LessonFields) {
  const conceptId = createConceptId(fields.conceptId);
  if (!(await deps.concepts.findById(conceptId))) throw new NotFoundError('المفهوم');

  const videoId = parseYouTubeVideoId(fields.videoUrl);
  return {
    title: fields.title,
    conceptId,
    segment: new VideoSegment({
      videoId,
      startSeconds: parseTimecode(fields.start),
      endSeconds: parseTimecode(fields.end),
    }),
    sourceUrl: toWatchUrl(videoId),
    channelName: fields.channelName,
    language: fields.language,
    summary: fields.summary.trim() === '' ? undefined : fields.summary,
    notes: fields.notes?.trim() ? fields.notes : undefined,
  };
}

function locateModule(path: LearningPath, moduleId: string) {
  const module = path.findModule(createModuleId(moduleId));
  if (!module) throw new NotFoundError('الوحدة');
  return module;
}

export class AddLessonUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & LessonFields & { pathId: string; moduleId: string },
  ): Promise<{ lessonId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const module = locateModule(path, request.moduleId);

    const lesson = new Lesson({
      id: createLessonId(this.deps.ids.next('les')),
      ...(await buildLessonChanges(this.deps, request)),
      reviewedByHuman: false,
    });
    module.addLesson(lesson);
    await this.deps.paths.save(path);
    return { lessonId: lesson.id };
  }
}

export class UpdateLessonUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & LessonFields & { pathId: string; lessonId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');

    const changes = await buildLessonChanges(this.deps, request);
    found.module.replaceLesson(found.lesson.update({ ...changes, reviewedByHuman: false }));
    await this.deps.paths.save(path);
  }
}

export class DeleteLessonUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; lessonId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    found.module.removeLesson(found.lesson.id);
    await this.deps.paths.save(path);
  }
}

export class MoveLessonUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; lessonId: string; direction: 'up' | 'down' },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    found.module.moveLesson(found.lesson.id, request.direction);
    await this.deps.paths.save(path);
  }
}

/** الوسيلة الوحيدة لمنح/سحب «مراجعة بشرية»؛ يقررها المالك بعد مشاهدة المقطع */
export class SetLessonReviewUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; lessonId: string; reviewed: boolean },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const found = path.findLesson(createLessonId(request.lessonId));
    if (!found) throw new NotFoundError('الدرس');
    found.module.replaceLesson(found.lesson.update({ reviewedByHuman: request.reviewed }));
    await this.deps.paths.save(path);
  }
}
