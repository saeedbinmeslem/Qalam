/**
 * @file seed-data.ts
 * @description بيانات البذور الأولية (Seed Data) لمسار برمجي مصغّر
 *
 * يُستخدم لتحميل مسار أولي متكامل مع رسم بياني للمفاهيم (Concept Graph)
 * ودروس يوتيوب حقيقية محددة البداية والنهاية وموثقة المصدر.
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

export function createInitialSeedPath(): {
  path: LearningPath;
  concepts: Concept[];
} {
  // 1. تعريف المفاهيم التعليمية مع المتطلبات السابقة
  const c1Variables = new Concept({
    id: createConceptId('concept-variables'),
    name: 'المتغيرات وأنواع البيانات الأساسية',
    description: 'فهم حجز الذاكرة والأنواع: int, float, char, bool',
    level: 1,
  });

  const c2Operators = new Concept({
    id: createConceptId('concept-operators'),
    name: 'العمليات الحسابية والمنطقية',
    description: 'الجمع، الطرح، الضرب، القسمة، وباقي القسمة والعمليات المنطقية',
    level: 1,
    prerequisiteIds: [c1Variables.id],
  });

  const c3Conditions = new Concept({
    id: createConceptId('concept-conditions'),
    name: 'الجمل الشرطية (if / else)',
    description: 'اتخاذ القرارات والتحكم في مسار تنفيذ البرنامج',
    level: 2,
    prerequisiteIds: [c2Operators.id],
  });

  const c4Loops = new Concept({
    id: createConceptId('concept-loops'),
    name: 'حلقات التكرار (for / while)',
    description: 'تكرار تنفيذ الأوامر والتعامل مع عدادات التكرار',
    level: 2,
    prerequisiteIds: [c3Conditions.id],
  });

  const c5Functions = new Concept({
    id: createConceptId('concept-functions'),
    name: 'الدوال (Functions) وإعادة الاستخدام',
    description: 'تقسيم البرنامج إلى دوال وتمرير المعاملات وإرجاع القيم',
    level: 3,
    prerequisiteIds: [c4Loops.id],
  });

  const allConcepts = [c1Variables, c2Operators, c3Conditions, c4Loops, c5Functions];

  // 2. إنشاء المسار التعليمي
  const path = new LearningPath({
    id: createPathId('path-cpp-foundations'),
    title: 'أساسيات البرمجة وحل المشكلات (C++)',
    description:
      'مسار عملي متكامل يبدأ من الصفر ويغطي المفاهيم الأساسية مع تمارين وتطبيقات حقيقية.',
    targetGoal: 'بناء أساس برمجي متين والانتقال إلى التفكير الخوارزمي',
    subject: 'C++',
  });

  // 3. إنشاء الوحدات والدروس
  // الوحدة 1: الأساسيات والمدخلات
  const mod1 = new Module({
    id: createModuleId('mod-1-foundations'),
    title: 'الوحدة الأولى: البداية والمتغيرات',
    description: 'كيف يفكر الحاسوب وكيف نخزن البيانات في الذاكرة',
    orderIndex: 1,
  });

  mod1.addLesson(
    new Lesson({
      id: createLessonId('les-1-1-vars'),
      title: 'ما هي المتغيرات وكيف نعلن عنها؟',
      conceptId: c1Variables.id,
      segment: new VideoSegment({
        videoId: 'vLnPwxZdW4Y',
        startSeconds: 60,
        endSeconds: 420,
      }),
      sourceUrl: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
      channelName: 'freeCodeCamp.org',
      language: 'en',
      summary: 'شرح مفهوم الذاكرة وكيف يحجز البرنامج متغيراً من نوع int و float',
      reviewedByHuman: true,
    })
  );

  mod1.addLesson(
    new Lesson({
      id: createLessonId('les-1-2-ops'),
      title: 'العمليات الحسابية والتحويل بين الأنواع',
      conceptId: c2Operators.id,
      segment: new VideoSegment({
        videoId: 'vLnPwxZdW4Y',
        startSeconds: 425,
        endSeconds: 780,
      }),
      sourceUrl: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
      channelName: 'freeCodeCamp.org',
      language: 'en',
      summary: 'العمليات الحسابية، أسبقية العمليات، وناتج قسمة الأعداد الصحيحة',
      reviewedByHuman: true,
    })
  );

  // الوحدة 2: التحكم في مسار البرنامج
  const mod2 = new Module({
    id: createModuleId('mod-2-control-flow'),
    title: 'الوحدة الثانية: الشروط والتكرار',
    description: 'صناعة القرارات البرمجية وتكرار المهام المعقدة',
    orderIndex: 2,
  });

  mod2.addLesson(
    new Lesson({
      id: createLessonId('les-2-1-conditions'),
      title: 'القرارات البرمجية باستخدام if و else',
      conceptId: c3Conditions.id,
      segment: new VideoSegment({
        videoId: 'vLnPwxZdW4Y',
        startSeconds: 1200,
        endSeconds: 1650,
      }),
      sourceUrl: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
      channelName: 'freeCodeCamp.org',
      language: 'en',
      summary: 'صياغة العبارات الشرطية ومقارنة القيم الحسابية والمنطقية',
      reviewedByHuman: true,
    })
  );

  mod2.addLesson(
    new Lesson({
      id: createLessonId('les-2-2-loops'),
      title: 'حلقات التكرار for و while',
      conceptId: c4Loops.id,
      segment: new VideoSegment({
        videoId: 'vLnPwxZdW4Y',
        startSeconds: 2100,
        endSeconds: 2600,
      }),
      sourceUrl: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
      channelName: 'freeCodeCamp.org',
      language: 'en',
      summary: 'فهم شرط التوقف في الحلقة وتجنب الوقوع في الحلقات اللا نهائية',
      reviewedByHuman: true,
    })
  );

  // ربط الوحدات بالمسار
  path.addModule(mod1);
  path.addModule(mod2);

  return { path, concepts: allConcepts };
}
