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
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
} from '@qalam/domain';

const CHANNEL_NAME = 'Programming Advices';

/** وصف درس خام قبل تحويله إلى كيان Lesson. */
interface LessonSeed {
  readonly id: string;
  readonly title: string;
  readonly conceptId: ReturnType<typeof createConceptId>;
  readonly videoId: string;
  readonly durationSeconds: number;
  readonly summary: string;
}

function toLesson(seed: LessonSeed): Lesson {
  return new Lesson({
    id: createLessonId(seed.id),
    title: seed.title,
    conceptId: seed.conceptId,
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
  // 1. المفاهيم مع المتطلبات السابقة (concept graph)
  const data = new Concept({
    id: createConceptId('concept-data-information'),
    name: 'البيانات والمعلومات والمعرفة',
    description: 'الفرق بين البيانات والمعلومات والمعرفة والحكمة',
    level: 1,
  });
  const computer = new Concept({
    id: createConceptId('concept-computer'),
    name: 'الحاسوب ومكوناته',
    description: 'ما هو الحاسوب، وظائفه، ومكوناته الأساسية',
    level: 1,
    prerequisiteIds: [data.id],
  });
  const units = new Concept({
    id: createConceptId('concept-units'),
    name: 'السرعات ووحدات القياس',
    description: 'وحدات قياس التخزين والسرعة في الحاسوب',
    level: 1,
    prerequisiteIds: [computer.id],
  });
  const binary = new Concept({
    id: createConceptId('concept-binary'),
    name: 'النظام الثنائي وتمثيل البيانات',
    description: 'كيف يمثّل الحاسوب البيانات بالنظام الثنائي',
    level: 2,
    prerequisiteIds: [computer.id],
  });
  const bytes = new Concept({
    id: createConceptId('concept-bytes'),
    name: 'أجزاء البايت ومصطلحاتها',
    description: 'البت والنيبل والبايت والكلمة',
    level: 2,
    prerequisiteIds: [binary.id],
  });
  const hex = new Concept({
    id: createConceptId('concept-hex'),
    name: 'النظام السداسي عشر',
    description: 'التمثيل والتحويل بين الثنائي والسداسي عشر',
    level: 2,
    prerequisiteIds: [binary.id],
  });
  const octal = new Concept({
    id: createConceptId('concept-octal'),
    name: 'النظام الثماني',
    description: 'التمثيل والتحويل في النظام الثماني',
    level: 2,
    prerequisiteIds: [binary.id],
  });
  const networks = new Concept({
    id: createConceptId('concept-networks'),
    name: 'الشبكات',
    description: 'مفاهيم الشبكات الأساسية',
    level: 2,
    prerequisiteIds: [computer.id],
  });
  const languages = new Concept({
    id: createConceptId('concept-programming-languages'),
    name: 'لغات البرمجة',
    description: 'أنواع لغات البرمجة وتصنيفاتها',
    level: 3,
    prerequisiteIds: [computer.id],
  });
  const compilation = new Concept({
    id: createConceptId('concept-compiler-interpreter'),
    name: 'الكومبايلر والإنتربرتر',
    description: 'الفرق بين الترجمة والتفسير',
    level: 3,
    prerequisiteIds: [languages.id],
  });

  const concepts = [data, computer, units, binary, bytes, hex, octal, networks, languages, compilation];

  // 2. المسار
  const path = new LearningPath({
    id: createPathId('path-computer-fundamentals'),
    title: 'أساسيات الحاسوب للمبرمج',
    description:
      'من البيانات والمعلومات إلى أنظمة العد والشبكات ولغات البرمجة: الأساس الذي يحتاجه كل مبرمج قبل البدء.',
    targetGoal: 'فهم كيف يعمل الحاسوب وكيف تُمثَّل البيانات قبل تعلم أي لغة برمجة',
    subject: 'أساسيات الحاسوب',
  });

  // 3. الوحدات والدروس (بترتيب القائمة الأصلية)
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
      conceptId: data.id,
      videoId: 'qTVRs1wTwho',
      durationSeconds: 506,
      summary: 'يميّز بين البيانات والمعلومات والمعرفة والحكمة.',
    },
    {
      id: 'les-02-computer',
      title: 'ما هو الكمبيوتر وما هي وظائفه ومكوناته؟',
      conceptId: computer.id,
      videoId: 'E6cSCFZGiVg',
      durationSeconds: 1609,
      summary: 'تعريف الحاسوب ووظائفه ومكوناته.',
    },
    {
      id: 'les-03-binary',
      title: 'النظام الثنائي وتمثيل البيانات في الكمبيوتر',
      conceptId: binary.id,
      videoId: 'CrA3v6AHTTo',
      durationSeconds: 2307,
      summary: 'كيف يمثّل الحاسوب البيانات بالنظام الثنائي.',
    },
    {
      id: 'les-04-units',
      title: 'السرعات ووحدات القياس في الكمبيوتر',
      conceptId: units.id,
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
      conceptId: hex.id,
      videoId: 'lGA_3kDhdZM',
      durationSeconds: 1768,
      summary: 'مدخل إلى النظام السداسي عشر.',
    },
    {
      id: 'les-06-bytes',
      title: 'أجزاء البايت ومصطلحاتها',
      conceptId: bytes.id,
      videoId: 'bBbPobqouys',
      durationSeconds: 346,
      summary: 'أجزاء البايت ومصطلحاتها.',
    },
    {
      id: 'les-07-hex-2',
      title: 'النظام السادس عشر – الجزء الثاني',
      conceptId: hex.id,
      videoId: 'el2mi4khoJg',
      durationSeconds: 524,
      summary: 'تتمة النظام السداسي عشر.',
    },
    {
      id: 'les-08-octal',
      title: 'النظام الثماني في الكمبيوتر',
      conceptId: octal.id,
      videoId: 'iRiS9Luixrc',
      durationSeconds: 941,
      summary: 'النظام الثماني وتمثيله.',
    },
    {
      id: 'les-09-programmer-calculator',
      title: 'آلة حاسبة المبرمجين',
      conceptId: octal.id,
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
      conceptId: networks.id,
      videoId: '26H2fRNHFlA',
      durationSeconds: 824,
      summary: 'مفاهيم الشبكات الأساسية.',
    },
    {
      id: 'les-11-languages-1',
      title: 'لغات البرمجة – الجزء الأول',
      conceptId: languages.id,
      videoId: 'c-bdX1pobxo',
      durationSeconds: 1239,
      summary: 'مدخل إلى لغات البرمجة.',
    },
    {
      id: 'les-12-compiler-interpreter',
      title: 'لغات البرمجة – الفرق بين الكومبايلر والإنتربرتر',
      conceptId: compilation.id,
      videoId: 'tmB3HpUEXsc',
      durationSeconds: 1209,
      summary: 'الفرق بين الكومبايلر والإنتربرتر.',
    },
    {
      id: 'les-13-languages-3',
      title: 'لغات البرمجة – الجزء الثالث',
      conceptId: languages.id,
      videoId: 'Hxi4_BmvrxI',
      durationSeconds: 1341,
      summary: 'تتمة لغات البرمجة.',
    },
  ].forEach((s) => mod3.addLesson(toLesson(s)));

  path.addModule(mod1);
  path.addModule(mod2);
  path.addModule(mod3);

  return { path, concepts };
}
