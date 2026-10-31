/**
 * @file seed-data.ts
 * @description بيانات البذور الأولية: مسار «أساسيات الحاسوب للمبرمج»
 *
 * المصدر: قائمة «كورس رقم 1 – البداية من هنا» لقناة Programming Advices
 * (PL3X--QIIK-OHgMV2yBz3GLfM5d_5BxOSj). معرّفات الفيديوهات ومددها قُرئت من يوتيوب نفسه.
 *
 * ملاحظات:
 * - كل مقطع يغطي الفيديو كاملًا (0 → المدة)؛ يضيّقه المالك لاحقًا من لوحة التحكم.
 * - الملخصات مشتقة من عناوين الدروس فقط، وتُستبدل بملخصات مبنية على المصدر في المرحلة 1.
 * - `reviewedByHuman` يبقى false حتى يوافق المالك على كل درس.
 */

import {
  Concept,
  Course,
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createCourseId,
  createLessonId,
  createModuleId,
  createPathId,
} from '@qalam/domain';

const CHANNEL_NAME = 'Programming Advices';

/** وصف درس خام قبل تحويله إلى كيان Lesson. */
interface LessonSeed {
  readonly id: string;
  readonly title: string;
  readonly videoId: string;
  readonly durationSeconds: number;
  readonly summary: string;
}

function toLesson(seed: LessonSeed): Lesson {
  return new Lesson({
    id: createLessonId(seed.id),
    title: seed.title,
    segment: new VideoSegment({
      videoId: seed.videoId,
      startSeconds: 0,
      endSeconds: seed.durationSeconds,
    }),
    sourceUrl: `https://www.youtube.com/watch?v=${seed.videoId}`,
    channelName: CHANNEL_NAME,
    language: 'ar',
    summary: seed.summary,
    reviewedByHuman: false,
  });
}

export function createInitialSeedPath(): {
  path: LearningPath;
  concepts: Concept[];
} {
  // 1. المسار
  const pathId = createPathId('path-computer-fundamentals');
  const path = new LearningPath({
    id: pathId,
    title: 'أساسيات الحاسوب للمبرمج',
    description:
      'من البيانات والمعلومات إلى أنظمة العد والشبكات ولغات البرمجة: الأساس الذي يحتاجه كل مبرمج قبل البدء.',
    targetGoal: 'فهم كيف يعمل الحاسوب وكيف تُمثَّل البيانات قبل تعلم أي لغة برمجة',
    subject: 'أساسيات الحاسوب',
  });


  // 2. مفاهيم المسار (تتبع هذا المسار وحده) بمتطلباتها السابقة
  const basics = new Concept({
    id: createConceptId('concept-computer-basics'),
    pathId,
    name: 'أساسيات الحاسوب',
    description: 'البيانات والمعلومات، وما هو الحاسوب، وكيف يقيس التخزين والسرعة',
    level: 1,
  });
  const numberSystems = new Concept({
    id: createConceptId('concept-number-systems'),
    pathId,
    name: 'أنظمة العد وتمثيل البيانات',
    description: 'النظام الثنائي والبايت والسداسي عشر والثماني',
    level: 2,
    prerequisiteIds: [basics.id],
  });
  const software = new Concept({
    id: createConceptId('concept-networks-languages'),
    pathId,
    name: 'الشبكات ولغات البرمجة',
    description: 'مفاهيم الشبكات وأنواع لغات البرمجة وكيف تُنفَّذ',
    level: 3,
    prerequisiteIds: [basics.id],
  });
  const concepts = [basics, numberSystems, software];

  // 3. كورس لكل مفهوم يضم وحداته ودروسه (بترتيب القائمة الأصلية)
  const course = (id: string, concept: Concept, order: number, title: string, description: string) =>
    new Course({ id: createCourseId(id), conceptId: concept.id, title, description, orderIndex: order });
  const mod1 = new Module({
    id: createModuleId('mod-1-computer-basics'),
    title: 'الوحدة الأولى: البيانات والحاسوب',
    description: 'ما هي البيانات، وما هو الحاسوب، وكيف يخزّنها ويقيسها',
    orderIndex: 1,
  });
  [
    {
      id: 'les-01-data-information',
      title: 'الفرق بين البيانات والمعلومات والمعرفة والحكمة',
      videoId: 'qTVRs1wTwho',
      durationSeconds: 506,
      summary: 'يميّز بين البيانات والمعلومات والمعرفة والحكمة.',
    },
    {
      id: 'les-02-computer',
      title: 'ما هو الكمبيوتر وما هي وظائفه ومكوناته؟',
      videoId: 'E6cSCFZGiVg',
      durationSeconds: 1609,
      summary: 'تعريف الحاسوب ووظائفه ومكوناته.',
    },
    {
      id: 'les-03-binary',
      title: 'النظام الثنائي وتمثيل البيانات في الكمبيوتر',
      videoId: 'CrA3v6AHTTo',
      durationSeconds: 2307,
      summary: 'كيف يمثّل الحاسوب البيانات بالنظام الثنائي.',
    },
    {
      id: 'les-04-units',
      title: 'السرعات ووحدات القياس في الكمبيوتر',
      videoId: 'FCNr5cj8O2E',
      durationSeconds: 1444,
      summary: 'وحدات قياس السرعات والتخزين.',
    },
  ].forEach((s) => mod1.addLesson(toLesson(s)));

  const mod2 = new Module({
    id: createModuleId('mod-2-number-systems'),
    title: 'الوحدة الثانية: أنظمة العد',
    description: 'البايت والنظامان السداسي عشر والثماني وأداة التحويل',
    orderIndex: 2,
  });
  [
    {
      id: 'les-05-hex-1',
      title: 'النظام السادس عشر في الكمبيوتر',
      videoId: 'lGA_3kDhdZM',
      durationSeconds: 1768,
      summary: 'مدخل إلى النظام السداسي عشر.',
    },
    {
      id: 'les-06-bytes',
      title: 'أجزاء البايت ومصطلحاتها',
      videoId: 'bBbPobqouys',
      durationSeconds: 346,
      summary: 'أجزاء البايت ومصطلحاتها.',
    },
    {
      id: 'les-07-hex-2',
      title: 'النظام السادس عشر – الجزء الثاني',
      videoId: 'el2mi4khoJg',
      durationSeconds: 524,
      summary: 'تتمة النظام السداسي عشر.',
    },
    {
      id: 'les-08-octal',
      title: 'النظام الثماني في الكمبيوتر',
      videoId: 'iRiS9Luixrc',
      durationSeconds: 941,
      summary: 'النظام الثماني وتمثيله.',
    },
    {
      id: 'les-09-programmer-calculator',
      title: 'آلة حاسبة المبرمجين',
      videoId: 'IOz2ba5OmcM',
      durationSeconds: 308,
      summary: 'استخدام آلة حاسبة المبرمجين للتحويل بين أنظمة العد.',
    },
  ].forEach((s) => mod2.addLesson(toLesson(s)));

  const mod3 = new Module({
    id: createModuleId('mod-3-networks-languages'),
    title: 'الوحدة الثالثة: الشبكات ولغات البرمجة',
    description: 'مفاهيم الشبكات وأنواع لغات البرمجة وكيف تُنفَّذ',
    orderIndex: 3,
  });
  [
    {
      id: 'les-10-networks',
      title: 'الشبكات',
      videoId: '26H2fRNHFlA',
      durationSeconds: 824,
      summary: 'مفاهيم الشبكات الأساسية.',
    },
    {
      id: 'les-11-languages-1',
      title: 'لغات البرمجة – الجزء الأول',
      videoId: 'c-bdX1pobxo',
      durationSeconds: 1239,
      summary: 'مدخل إلى لغات البرمجة.',
    },
    {
      id: 'les-12-compiler-interpreter',
      title: 'لغات البرمجة – الفرق بين الكومبايلر والإنتربرتر',
      videoId: 'tmB3HpUEXsc',
      durationSeconds: 1209,
      summary: 'الفرق بين الكومبايلر والإنتربرتر.',
    },
    {
      id: 'les-13-languages-3',
      title: 'لغات البرمجة – الجزء الثالث',
      videoId: 'Hxi4_BmvrxI',
      durationSeconds: 1341,
      summary: 'تتمة لغات البرمجة.',
    },
  ].forEach((s) => mod3.addLesson(toLesson(s)));

  const c1 = course('course-1-basics', basics, 1, 'مقدمة الحاسوب', 'ما هي البيانات، وما هو الحاسوب، وكيف يخزّنها ويقيسها');
  c1.addModule(mod1);
  const c2 = course('course-2-number-systems', numberSystems, 2, 'أنظمة العد للمبرمج', 'البايت والنظامان السداسي عشر والثماني وأداة التحويل');
  c2.addModule(mod2);
  const c3 = course('course-3-networks-languages', software, 3, 'الشبكات ولغات البرمجة', 'مفاهيم الشبكات وأنواع لغات البرمجة وكيف تُنفَّذ');
  c3.addModule(mod3);
  [c1, c2, c3].forEach((c) => path.addCourse(c));

  return { path, concepts };
}
