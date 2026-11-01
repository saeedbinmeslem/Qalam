/**
 * @file admin-videos-import.usecases.ts
 * @description استيراد فيديوهات مستقلة (بلا قائمة يوتيوب) ككورس واحد: روابط يوتيوب و/أو فيديوهات مرفوعة من الجهاز،
 * بالترتيب الذي أضافه المالك. لا ذكاء اصطناعي في الهيكل: المالك يعطي عنوان الكورس ومفهومه، وتوضع الدروس في وحدة واحدة.
 * عناوين يوتيوب تُترجم للعربية (تحسين لا شرط). كل درس يدخل «بانتظار المراجعة البشرية».
 */

import {
  Concept,
  Course,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createCourseId,
  createLessonId,
  createModuleId,
  parseCloudinaryVideoUrl,
  parseYouTubeVideoId,
  toWatchUrl,
} from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import type { VideoMetadataPort } from '../../ports/playlist-catalog.port.js';
import { translateTitles } from './admin-title-translation.usecases.js';
import { loadPath, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';

export interface VideosImportDeps extends AdminDeps {
  videos: VideoMetadataPort;
  llm: LlmClient;
}

/** عنصر من القائمة المرتبة: رابط يوتيوب، أو فيديو رُفع إلى Cloudinary */
export type VideoImportItem =
  | { kind: 'youtube'; url: string }
  | { kind: 'upload'; mediaUrl: string; title: string; durationSeconds: number };

const MODULE_TITLE = 'الدروس';
const UPLOAD_CHANNEL = 'رفع مباشر';
const ARABIC = /[؀-ۿ]/;

export interface ImportVideosResult {
  courseTitle: string;
  conceptName: string;
  newConcept: boolean;
  lessons: number;
}

interface PreparedLesson {
  title: string;
  /** عنوان يوتيوب الأصلي (يُترجم)؛ فارغ للمرفوع فعنوانه من المالك ولا يُترجم */
  translatable: boolean;
  build: (title: string) => Lesson;
}

export class ImportVideosUseCase {
  constructor(private readonly deps: VideosImportDeps) {}

  /** `conceptId` فارغ ينشئ مفهومًا جديدًا باسم الكورس */
  async execute(
    request: AdminRequest & { pathId: string; courseTitle: string; conceptId?: string; items: VideoImportItem[] },
  ): Promise<ImportVideosResult> {
    requireAdmin(this.deps.policy, request.actor);
    const courseTitle = request.courseTitle.trim();
    if (!courseTitle) throw new Error('عنوان الكورس مطلوب');
    if (request.items.length === 0) throw new Error('أضف فيديو واحدًا على الأقل');

    const path = await loadPath(this.deps.paths, request.pathId);

    // يوتيوب: نتحقق من الروابط ونجلب بياناتها دفعة واحدة، ثم نبني الدروس بترتيب إضافة المالك
    const youtubeIds = request.items.flatMap((item) => (item.kind === 'youtube' ? [parseYouTubeVideoId(item.url)] : []));
    const metadata = new Map(
      (youtubeIds.length > 0 ? await this.deps.videos.getVideos([...new Set(youtubeIds)]) : []).map((v) => [v.videoId, v]),
    );
    const existing = new Set(path.modules.flatMap((m) => m.lessons.map((l) => l.segment.videoId)));
    const seen = new Set<string>();

    const prepared: PreparedLesson[] = [];
    for (const item of request.items) {
      if (item.kind === 'youtube') {
        const id = parseYouTubeVideoId(item.url);
        const video = metadata.get(id);
        if (!video || video.durationSeconds <= 0) throw new Error(`الفيديو ${id} غير متاح (خاص أو محذوف)`);
        if (existing.has(id) || seen.has(id)) continue; // المكرر يُتجاوز
        seen.add(id);
        prepared.push({
          title: video.title,
          translatable: true,
          build: (title) =>
            new Lesson({
              id: createLessonId(this.deps.ids.next('les')),
              title,
              segment: new VideoSegment({ videoId: id, startSeconds: 0, endSeconds: video.durationSeconds }),
              sourceUrl: toWatchUrl(id),
              channelName: video.channelName || 'يوتيوب',
              language: ARABIC.test(video.title) ? 'ar' : 'en',
              reviewedByHuman: false,
            }),
        });
      } else {
        const media = parseCloudinaryVideoUrl(item.mediaUrl);
        prepared.push({
          title: item.title.trim() || 'درس بلا عنوان',
          translatable: false,
          build: (title) =>
            new Lesson({
              id: createLessonId(this.deps.ids.next('les')),
              title,
              segment: new VideoSegment({
                videoId: media.publicId,
                startSeconds: 0,
                endSeconds: Math.max(Math.ceil(item.durationSeconds), 1),
              }),
              sourceUrl: media.url,
              mediaUrl: media.url,
              channelName: UPLOAD_CHANNEL,
              language: 'ar',
              reviewedByHuman: false,
            }),
        });
      }
    }
    if (prepared.length === 0) throw new Error('كل هذه الفيديوهات موجودة في المسار أصلًا');

    const translations = await translateTitles(this.deps.llm, prepared.map((p) => (p.translatable ? p.title : '')));

    const concepts = await this.deps.concepts.findByPath(path.id);
    let concept: Concept | undefined;
    let created = false;
    if (request.conceptId) {
      concept = concepts.find((c) => c.id === request.conceptId);
      if (!concept) throw new NotFoundError('المفهوم');
    } else {
      concept = new Concept({
        id: createConceptId(this.deps.ids.next('concept')),
        pathId: path.id,
        name: courseTitle,
        description: '',
        level: 1,
        prerequisiteIds: [],
      });
      await this.deps.concepts.save(concept);
      created = true;
    }

    // المالك قد يعدّل المسار خلال الجلب والترجمة: نضيف إلى الحالة الحديثة
    const target = await loadPath(this.deps.paths, request.pathId);
    const course = new Course({
      id: createCourseId(this.deps.ids.next('course')),
      conceptId: concept.id,
      title: courseTitle,
      description: '',
      orderIndex: target.nextCourseOrderIndex,
    });
    const module = new Module({
      id: createModuleId(this.deps.ids.next('mod')),
      title: MODULE_TITLE,
      description: '',
      orderIndex: course.nextModuleOrderIndex,
    });
    for (const [i, p] of prepared.entries()) module.addLesson(p.build(translations.get(i) ?? p.title));
    course.addModule(module);
    target.addCourse(course);
    await this.deps.paths.save(target);

    return { courseTitle: course.title, conceptName: concept.name, newConcept: created, lessons: prepared.length };
  }
}
