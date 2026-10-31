/**
 * @file admin-playlist-import.usecases.ts
 * @description استيراد قائمة يوتيوب كاملة كـ**كورس واحد** داخل مسار: المالك يعطي المسار والرابط فقط،
 * والنموذج اللغوي يحدد المفهوم الذي يغطيه الكورس (من مفاهيم المسار نفسه، أو ينشئ مفهومًا جديدًا فيه بمتطلباته)،
 * ويقسّم القائمة إلى وحدات ودروس. الهيكل: مسار ← مفهوم ← كورس ← وحدات ← دروس.
 * المدة والقناة والمصدر تأتي من يوتيوب نفسه لا من النموذج.
 * قواعد الجودة: كل درس مستورد «بانتظار المراجعة البشرية»، والمقطع هو الفيديو كاملًا ويضيّقه المالك عند المراجعة،
 * والنموذج لا يرى إلا العناوين والأوصاف المنشورة (لا نص مفرّغ ولا نسخ للفيديو).
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
  parseYouTubePlaylistId,
  toWatchUrl,
  type ConceptId,
} from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import type { LlmClient } from '../../ports/llm-client.port.js';
import type { PlaylistCatalogPort, PlaylistVideo } from '../../ports/playlist-catalog.port.js';
import { loadPath, requireAdmin, type AdminDeps, type AdminRequest } from './admin-deps.js';

export interface PlaylistImportDeps extends AdminDeps {
  playlists: PlaylistCatalogPort;
  llm: LlmClient;
}

/**
 * لا سقف على عدد الفيديوهات: القائمة تُستورد كاملة ككورس واحد. فوق هذا العدد لا نطلب من النموذج
 * عنوانًا وملخصًا لكل درس (ردّ ضخم يتجاوز حدود المخرجات) بل تقسيمًا إلى وحدات بنطاقات أرقام فقط،
 * وتبقى عناوين الدروس من يوتيوب.
 */
export const DETAILED_DRAFT_MAX_VIDEOS = 50;
const DESCRIPTION_EXCERPT = 240;
const MAX_LEVEL = 10;
const EXTRA_MODULE_TITLE = 'دروس إضافية';
const COMPLETION_MODULE_TITLE = 'تكملة القائمة';

export interface PlaylistConceptDraft {
  /** معرّف مفهوم موجود في المسار، أو فارغ لمفهوم جديد */
  existingId: string;
  name: string;
  description: string;
  level: number;
  /** معرّفات مفاهيم موجودة في المسار هي متطلبات سابقة (للمفهوم الجديد فقط) */
  prerequisites: string[];
}

export interface PlaylistLessonDraft {
  index: number;
  title: string;
  summary: string;
  language: 'ar' | 'en';
}

export interface PlaylistModuleDraft {
  title: string;
  description: string;
  lessons: PlaylistLessonDraft[];
}

export interface PlaylistStructureDraft {
  concept: PlaylistConceptDraft;
  course: { title: string; description: string };
  modules: PlaylistModuleDraft[];
}

const wrap = (error: unknown) =>
  new Error(`تعذّر ترتيب القائمة بالذكاء الاصطناعي: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** JSON Schema المرسل للنموذج (structured outputs) */
export const PLAYLIST_STRUCTURE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['concept', 'courseTitle', 'courseDescription', 'modules'],
  properties: {
    concept: {
      type: 'object',
      additionalProperties: false,
      required: ['existingId', 'name', 'description', 'level', 'prerequisites'],
      properties: {
        existingId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        level: { type: 'integer' },
        prerequisites: { type: 'array', items: { type: 'string' } },
      },
    },
    // مسطّحان عمدًا: النماذج الضعيفة تخطئ في إغلاق الكائنات المتداخلة فتُدخل modules داخل course
    courseTitle: { type: 'string' },
    courseDescription: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'lessons'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['index', 'title', 'summary', 'language'],
              properties: {
                index: { type: 'integer' },
                title: { type: 'string' },
                summary: { type: 'string' },
                language: { type: 'string', enum: ['ar', 'en'] },
              },
            },
          },
        },
      },
    },
  },
};

/** تحقق يدوي صارم؛ العنصر المعيب يُهمل (والفيديو الذي لم يُسنَد يذهب لوحدة «دروس إضافية») */
export function parsePlaylistStructure(raw: unknown): PlaylistStructureDraft {
  const data = raw as {
    concept?: Record<string, unknown>;
    courseTitle?: unknown;
    courseDescription?: unknown;
    modules?: unknown;
  } | null;
  if (!data || typeof data.concept !== 'object' || data.concept === null || !Array.isArray(data.modules)) {
    throw new Error('ردّ النموذج غير صالح: لا مفهوم أو وحدات');
  }

  const c = data.concept;
  const level = Number(c.level);
  const concept: PlaylistConceptDraft = {
    existingId: str(c.existingId),
    name: str(c.name),
    description: str(c.description),
    level: Number.isFinite(level) ? Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL) : 1,
    prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites.map(str).filter(Boolean) : [],
  };

  const modules: PlaylistModuleDraft[] = [];
  for (const item of data.modules as Record<string, unknown>[]) {
    const lessons: PlaylistLessonDraft[] = [];
    for (const l of (Array.isArray(item?.lessons) ? item.lessons : []) as Record<string, unknown>[]) {
      if (!Number.isInteger(l?.index)) continue;
      lessons.push({
        index: l.index as number,
        title: str(l.title),
        summary: str(l.summary),
        language: l.language === 'en' ? 'en' : 'ar',
      });
    }
    if (lessons.length > 0) modules.push({ title: str(item.title), description: str(item.description), lessons });
  }
  if (modules.length === 0) throw new Error('ردّ النموذج غير صالح: لا وحدات');
  return { concept, course: { title: str(data.courseTitle), description: str(data.courseDescription) }, modules };
}

const SYSTEM_PROMPT = `أنت مصمم مناهج يحوّل قائمة تشغيل على يوتيوب إلى كورس واحد داخل مسار تعليمي في منصة عربية.
الهيكل: مسار ← مفاهيم ← كورسات ← وحدات ← دروس. القائمة كلها تصير كورسًا واحدًا يغطي مفهومًا واحدًا كاملًا.

المطلوب:
1) concept: المفهوم الذي يغطيه الكورس كاملًا. إن وُجد في «مفاهيم المسار» مفهوم يطابقه فاجعل existingId معرّفه حرفيًا. وإلا فمفهوم جديد: existingId نص فارغ، وname اسم موجز عام (مجال لا درس واحد)، وdescription جملة، وlevel من 1 (الأساسي) إلى 10، وprerequisites معرّفات مفاهيم من «مفاهيم المسار» يلزم تعلمها قبله (قد تكون فارغة).
2) courseTitle وcourseDescription: عنوان الكورس ووصفه (حقلان في أعلى الكائن، لا داخل concept ولا modules).
3) modules: قسّم الفيديوهات إلى وحدات متتابعة منطقيًا (من 1 إلى 8 وحدات حسب الطول). لكل وحدة title قصير وdescription بجملة. حافظ على ترتيب القائمة داخل الوحدة إلا لضرورة تعليمية واضحة. كل فيديو يظهر مرة واحدة فقط. لكل درس: index رقم الفيديو كما أُعطي، وtitle واضح موجز بلغة الفيديو (بلا إيموجي ولا اسم القناة ولا أرقام حلقات زائدة)، وsummary جملة أو جملتان مبنيتان على الوصف المنشور فقط (فارغ إن لم يكفِ الوصف)، وlanguage (ar أو en).

شكل الناتج (أغلق كل كائن قبل الذي بعده): {"concept":{...},"courseTitle":"...","courseDescription":"...","modules":[{"title":"...","description":"...","lessons":[{"index":0,"title":"...","summary":"...","language":"ar"}]}]}

قواعد صارمة:
- استند إلى العنوان والوصف المنشورين فقط، ولا تختلق محتوى.
- لا تُدخل معرّف مفهوم من خارج «مفاهيم المسار».
- نص عادي فقط: بلا Markdown ولا LaTeX.`;

export interface ImportPlaylistResult {
  courseTitle: string;
  conceptName: string;
  newConcept: boolean;
  modules: number;
  lessons: number;
  skipped: number;
}

/** مخطط القوائم الطويلة: وحدات بنطاقات أرقام متصلة بدل عنوان وملخص لكل درس */
export const LARGE_PLAYLIST_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['concept', 'courseTitle', 'courseDescription', 'modules'],
  properties: {
    concept: (PLAYLIST_STRUCTURE_SCHEMA.properties as Record<string, unknown>).concept,
    courseTitle: { type: 'string' },
    courseDescription: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'firstIndex', 'lastIndex'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          firstIndex: { type: 'integer' },
          lastIndex: { type: 'integer' },
        },
      },
    },
  },
};

const ARABIC = /[؀-ۿ]/;

/** يحوّل ردّ النطاقات إلى المسودة المعتادة؛ النطاق المعيب يُهمل وما لم يُغطَّ يدخل «دروس إضافية» */
export function parseLargePlaylistStructure(raw: unknown, titles: string[]): PlaylistStructureDraft {
  const data = raw as { modules?: unknown } | null;
  if (!data || !Array.isArray(data.modules)) throw new Error('ردّ النموذج غير صالح: لا وحدات');
  // نستعير تحقق المفهوم والعنوان من المحلل الأول بإعطائه وحدة صورية
  const base = parsePlaylistStructure({
    ...(raw as object),
    modules: [{ title: '', description: '', lessons: [{ index: 0 }] }],
  });
  const covered = new Set<number>();
  const modules: PlaylistModuleDraft[] = [];
  for (const item of data.modules as Record<string, unknown>[]) {
    const first = Number(item?.firstIndex);
    const last = Number(item?.lastIndex);
    if (!Number.isInteger(first) || !Number.isInteger(last)) continue;
    const lessons: PlaylistLessonDraft[] = [];
    for (let i = Math.max(first, 0); i <= Math.min(last, titles.length - 1); i += 1) {
      if (covered.has(i)) continue;
      covered.add(i);
      lessons.push({ index: i, title: '', summary: '', language: ARABIC.test(titles[i] ?? '') ? 'ar' : 'en' });
    }
    if (lessons.length > 0) modules.push({ title: str(item.title), description: str(item.description), lessons });
  }
  if (modules.length === 0) throw new Error('ردّ النموذج غير صالح: لا وحدات');
  return { concept: base.concept, course: base.course, modules };
}

const LARGE_SYSTEM_PROMPT = `أنت مصمم مناهج يحوّل قائمة تشغيل طويلة على يوتيوب إلى كورس واحد داخل مسار تعليمي في منصة عربية.
المطلوب: concept (المفهوم الذي يغطيه الكورس؛ existingId معرّف مفهوم من «مفاهيم المسار» حرفيًا إن طابق، وإلا فارغ مع name وdescription وlevel من 1 إلى 10 وprerequisites من معرّفات المسار)، وcourseTitle وcourseDescription، وmodules: وحدات متتابعة تغطي كل الفيديوهات بلا تداخل، لكل وحدة title وdescription بجملة، وfirstIndex وlastIndex (رقما أول وآخر فيديو فيها كما أُعطيا). اجعل الوحدات بحجم معقول (من 5 إلى 15 درسًا تقريبًا) وفق تسلسل المحتوى.
شكل الناتج: {"concept":{"existingId":"","name":"","description":"","level":1,"prerequisites":[]},"courseTitle":"","courseDescription":"","modules":[{"title":"","description":"","firstIndex":0,"lastIndex":9}]}
استند إلى العناوين فقط ولا تختلق محتوى. نص عادي بلا Markdown.`;

export class ImportPlaylistUseCase {
  constructor(private readonly deps: PlaylistImportDeps) {}

  /**
   * `courseId` يحوّل الاستيراد إلى **إكمال** كورس موجود (بعد فشل أو انقطاع): تُضاف إليه الفيديوهات الناقصة من القائمة
   * في وحدة جديدة بترتيب القائمة، بلا استدعاء للنموذج وبلا مفهوم جديد.
   */
  async execute(request: AdminRequest & { pathId: string; playlistUrl: string; courseId?: string }): Promise<ImportPlaylistResult> {
    requireAdmin(this.deps.policy, request.actor);
    const playlistId = parseYouTubePlaylistId(request.playlistUrl);
    const path = await loadPath(this.deps.paths, request.pathId);

    // نتجاوز ما هو موجود في المسار أصلًا (إعادة الاستيراد آمنة) وما لا مدة له (محذوف أو خاص)
    const existing = new Set(path.modules.flatMap((m) => m.lessons.map((l) => l.segment.videoId)));
    const fetched = await this.deps.playlists.listVideos(playlistId);
    const videos = fetched.filter((v) => v.durationSeconds > 0 && !existing.has(v.videoId));
    if (request.courseId) return this.completeCourse(path, request.courseId, videos, fetched.length);
    if (videos.length === 0) throw new Error('لا فيديوهات جديدة قابلة للاستيراد في هذه القائمة');

    const pathConcepts = await this.deps.concepts.findByPath(path.id);
    const draft = await this.draftStructure(videos, pathConcepts, path.title);

    // المفهوم أولًا لأن الكورس يشير إليه (مفتاح أجنبي)
    const { concept, created } = await this.resolveConcept(draft.concept, pathConcepts, path.id);

    // ترتيب النموذج بطيء وقد يعدّل المالك المسار خلاله: نعيد قراءته لنضيف الكورس إلى الحالة الحديثة
    const target = await loadPath(this.deps.paths, request.pathId);

    const course = new Course({
      id: createCourseId(this.deps.ids.next('course')),
      conceptId: concept.id,
      title: draft.course.title || concept.name,
      description: draft.course.description,
      orderIndex: target.nextCourseOrderIndex,
    });

    const assigned = new Set<number>();
    const buildLesson = (video: PlaylistVideo, d?: PlaylistLessonDraft) =>
      new Lesson({
        id: createLessonId(this.deps.ids.next('les')),
        title: d?.title || video.title,
        segment: new VideoSegment({ videoId: video.videoId, startSeconds: 0, endSeconds: video.durationSeconds }),
        sourceUrl: toWatchUrl(video.videoId),
        channelName: video.channelName,
        language: d?.language ?? 'ar',
        summary: d?.summary || undefined,
        reviewedByHuman: false,
      });
    const addModule = (title: string, description: string, lessons: Lesson[]) => {
      const module = new Module({
        id: createModuleId(this.deps.ids.next('mod')),
        title,
        description,
        orderIndex: course.nextModuleOrderIndex,
      });
      for (const lesson of lessons) module.addLesson(lesson);
      course.addModule(module);
    };

    for (const moduleDraft of draft.modules) {
      const lessons: Lesson[] = [];
      for (const d of moduleDraft.lessons) {
        const video = videos[d.index];
        if (!video || assigned.has(d.index)) continue;
        assigned.add(d.index);
        lessons.push(buildLesson(video, d));
      }
      if (lessons.length > 0) addModule(moduleDraft.title || `الوحدة ${course.nextModuleOrderIndex}`, moduleDraft.description, lessons);
    }

    // ما لم يسنده النموذج لا يضيع: يدخل وحدة أخيرة
    const leftovers = videos.flatMap((video, i) => (assigned.has(i) ? [] : [buildLesson(video)]));
    if (leftovers.length > 0) addModule(EXTRA_MODULE_TITLE, '', leftovers);

    target.addCourse(course);
    await this.deps.paths.save(target);
    return {
      courseTitle: course.title,
      conceptName: concept.name,
      newConcept: created,
      modules: course.modules.length,
      lessons: videos.length,
      skipped: fetched.length - videos.length,
    };
  }

  private async completeCourse(
    path: Awaited<ReturnType<typeof loadPath>>,
    courseId: string,
    videos: PlaylistVideo[],
    fetchedCount: number,
  ): Promise<ImportPlaylistResult> {
    const course = path.courses.find((c) => c.id === courseId);
    if (!course) throw new NotFoundError('الكورس');
    if (videos.length === 0) throw new Error('الكورس مكتمل: كل فيديوهات القائمة موجودة في المسار أصلًا');

    const module = new Module({
      id: createModuleId(this.deps.ids.next('mod')),
      title: COMPLETION_MODULE_TITLE,
      description: 'فيديوهات القائمة التي لم تُضَف في الاستيراد الأول',
      orderIndex: course.nextModuleOrderIndex,
    });
    for (const video of videos) {
      module.addLesson(
        new Lesson({
          id: createLessonId(this.deps.ids.next('les')),
          title: video.title,
          segment: new VideoSegment({ videoId: video.videoId, startSeconds: 0, endSeconds: video.durationSeconds }),
          sourceUrl: toWatchUrl(video.videoId),
          channelName: video.channelName,
          language: ARABIC.test(video.title) ? 'ar' : 'en',
          reviewedByHuman: false,
        }),
      );
    }
    course.addModule(module);
    await this.deps.paths.save(path);

    const concept = await this.deps.concepts.findById(course.conceptId);
    return {
      courseTitle: course.title,
      conceptName: concept?.name ?? '',
      newConcept: false,
      modules: 1,
      lessons: videos.length,
      skipped: fetchedCount - videos.length,
    };
  }

  /** يعيد استعمال مفهوم المسار بالمعرّف أو بالاسم، وإلا ينشئ مفهومًا جديدًا في المسار بمتطلباته من المسار نفسه */
  private async resolveConcept(
    draft: PlaylistConceptDraft,
    pathConcepts: Concept[],
    pathId: Concept['pathId'],
  ): Promise<{ concept: Concept; created: boolean }> {
    const norm = (s: string) => s.trim().toLowerCase();
    const match =
      pathConcepts.find((c) => c.id === draft.existingId) ??
      (draft.name ? pathConcepts.find((c) => norm(c.name) === norm(draft.name)) : undefined);
    if (match) return { concept: match, created: false };
    if (!draft.name) throw new Error('تعذّر تحديد المفهوم الذي يغطيه الكورس. أنشئ مفهومًا في المسار وأعد المحاولة');

    const known = new Set<string>(pathConcepts.map((c) => c.id));
    const prerequisiteIds: ConceptId[] = [...new Set(draft.prerequisites)].filter((id) => known.has(id)).map(createConceptId);
    const concept = new Concept({
      id: createConceptId(this.deps.ids.next('concept')),
      pathId,
      name: draft.name,
      description: draft.description,
      level: draft.level,
      prerequisiteIds,
    });
    await this.deps.concepts.save(concept);
    return { concept, created: true };
  }

  /** قائمة طويلة: العناوين وحدها (بلا أوصاف) والردّ نطاقات وحدات، بنفس سياسة إعادة المحاولة */
  private async draftLargeStructure(videos: PlaylistVideo[], concepts: Concept[], pathTitle: string): Promise<PlaylistStructureDraft> {
    const titles = videos.map((v) => v.title);
    const request = {
      system: LARGE_SYSTEM_PROMPT,
      schema: LARGE_PLAYLIST_SCHEMA,
      user: [
        `المسار: ${pathTitle}`,
        'مفاهيم المسار (المعرّف: الاسم):',
        ...(concepts.length > 0 ? concepts.map((c) => `${c.id}: ${c.name}`) : ['(لا توجد بعد)']),
        '',
        `الفيديوهات (${videos.length}، من 0 إلى ${videos.length - 1}):`,
        ...titles.map((t, i) => `${i}. ${t}`),
      ].join('\n'),
    };
    const attempt = async () => parseLargePlaylistStructure(await this.deps.llm.generateJson(request), titles);
    try {
      return await attempt();
    } catch (first) {
      if (!(first instanceof Error) || !/JSON|ردّ النموذج غير صالح/.test(first.message)) throw wrap(first);
      try {
        return await attempt();
      } catch (second) {
        throw wrap(second);
      }
    }
  }

  private async draftStructure(videos: PlaylistVideo[], concepts: Concept[], pathTitle: string): Promise<PlaylistStructureDraft> {
    if (videos.length > DETAILED_DRAFT_MAX_VIDEOS) return this.draftLargeStructure(videos, concepts, pathTitle);
    const request = {
      system: SYSTEM_PROMPT,
      schema: PLAYLIST_STRUCTURE_SCHEMA,
      user: [
          `المسار: ${pathTitle}`,
          'مفاهيم المسار (المعرّف: الاسم):',
          ...(concepts.length > 0 ? concepts.map((c) => `${c.id}: ${c.name}`) : ['(لا توجد بعد)']),
          '',
          'الفيديوهات:',
          ...videos.map(
            (v, i) =>
              `${i}. العنوان: ${v.title} | القناة: ${v.channelName} | الوصف: ${v.description.replace(/\s+/g, ' ').slice(0, DESCRIPTION_EXCERPT)}`,
          ),
      ].join('\n'),
    };
    // النماذج المجانية تُخطئ أحيانًا في صياغة JSON أو بنيته: نعيد المحاولة مرة واحدة على هذا الخطأ فقط
    const attempt = async () => parsePlaylistStructure(await this.deps.llm.generateJson(request));
    try {
      return await attempt();
    } catch (first) {
      if (!(first instanceof Error) || !/JSON|ردّ النموذج غير صالح/.test(first.message)) throw wrap(first);
      try {
        return await attempt();
      } catch (second) {
        throw wrap(second);
      }
    }
  }
}
