/**
 * @file admin-lessons.usecases.ts
 * @description إدارة الدروس. قاعدة الجودة: أي تعديل على محتوى الدرس (الفيديو أو المقطع أو العنوان
 * أو المفهوم أو القناة أو الملخص) يُسقط وسم «مراجعة بشرية»، فلا يبقى درس معتمدًا بعد تغييره.
 * وسم المراجعة نفسه لا يُمنح إلا عبر SetLessonReviewUseCase.
 */

import {
  Lesson,
  VideoSegment,
  createCourseId,
  createLessonId,
  createModuleId,
  parseCloudinaryVideoUrl,
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
  /** رابط فيديو مرفوع إلى Cloudinary؛ إن وُجد حلّ محل رابط يوتيوب */
  mediaUrl?: string;
  /** مدة الفيديو المرفوع بالثواني (يرسلها Cloudinary)، تُستعمل نهايةً للمقطع إن تُركت النهاية فارغة */
  mediaDurationSeconds?: number;
}

/** المقطع والمصدر: فيديو مرفوع (Cloudinary) أو تضمين يوتيوب */
function resolveVideo(fields: LessonFields) {
  const mediaUrl = fields.mediaUrl?.trim();
  if (mediaUrl) {
    const media = parseCloudinaryVideoUrl(mediaUrl);
    const end = fields.end.trim() !== '' ? parseTimecode(fields.end) : Math.ceil(fields.mediaDurationSeconds ?? 0);
    return {
      segment: new VideoSegment({
        videoId: media.publicId,
        startSeconds: fields.start.trim() !== '' ? parseTimecode(fields.start) : 0,
        endSeconds: end,
      }),
      sourceUrl: media.url,
      mediaUrl: media.url,
    };
  }
  const videoId = parseYouTubeVideoId(fields.videoUrl);
  return {
    segment: new VideoSegment({
      videoId,
      startSeconds: parseTimecode(fields.start),
      endSeconds: parseTimecode(fields.end),
    }),
    sourceUrl: toWatchUrl(videoId),
    mediaUrl: undefined,
  };
}

/** مفهوم الدرس من كورسه، فلا يُدخَل مع حقول الدرس */
function buildLessonChanges(fields: LessonFields) {
  return {
    title: fields.title,
    ...resolveVideo(fields),
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
      ...buildLessonChanges(request),
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

    const changes = buildLessonChanges(request);
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

/**
 * اعتماد دفعة من الدروس بضغطة واحدة: كل دروس كورس (`courseId`) أو كل دروس وحدة (`moduleId`).
 * القرار قرار المالك كالاعتماد الفردي، لكنه يوفّر الضغط درسًا درسًا؛ يعيد عدد الدروس التي اعتُمدت فعلًا.
 */
export class ApproveLessonsUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string } & ({ courseId: string } | { moduleId: string }),
  ): Promise<{ approved: number }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);

    let modules;
    if ('courseId' in request) {
      const course = path.findCourse(createCourseId(request.courseId));
      if (!course) throw new NotFoundError('الكورس');
      modules = course.modules;
    } else {
      modules = [locateModule(path, request.moduleId)];
    }

    let approved = 0;
    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (lesson.reviewedByHuman) continue;
        module.replaceLesson(lesson.update({ reviewedByHuman: true }));
        approved += 1;
      }
    }
    if (approved > 0) await this.deps.paths.save(path);
    return { approved };
  }
}
