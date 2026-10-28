# 📜 سجل ما تم تنفيذه (Implementation Log) — مشروع قلم

> **تنبيه إلزامي لجميع المطورين والوكلاء (AI Agents):**  
> **يجب تحديث هذا الملف بعد كل تعديل أو إنشاء لأي ملفات في المشروع، لتوثيق التغييرات والحفاظ على تتبع دقيق لمسار التنفيذ.**

---

## 📌 نظرة عامة على الحالة الحالية

- **المرحلة الحالية:** المرحلة 0 — الأساس (Phase 0: Foundation)
- **نسبة إنجاز المرحلة 0:** 85%
- **حالة البناء (Build):** ✅ ناجح (TypeScript v5.6 / NodeNext)
- **حالة الاختبارات (Tests):** ✅ 10 اختبارات ناجحة عبر 4 ملفات (Vitest)
- **فحص جودة الكود (Linting):** ✅ خالٍ من المخالفات، وقواعد Clean Architecture مفروضة تلقائياً عبر ESLint

---

## 🛠️ تفاصيل ما تم تنفيذه في المرحلة 0

### 1. إعداد الـ Monorepo والأدوات الأساسية (الخطوة 0.1)
- [x] إنشاء جذر المشروع بنظام **npm workspaces** يربط بين `packages/*` و `apps/*`.
- [x] إعداد TypeScript موحّد:
  - [`tsconfig.base.json`](file:///d:/my-projects/Qalam/tsconfig.base.json): إعدادات مشتركة بصرامة عالية (`strict: true`, `NodeNext`, `verbatimModuleSyntax: true`, مع حصر الأنواع لمنع تسرب `@types`).
  - [`tsconfig.json`](file:///d:/my-projects/Qalam/tsconfig.json): ملف رئيسي يربط الحزم بنظام Project References لتسريع البناء التدريجي.
- [x] فرض قواعد العمارة النظيفة (Clean Architecture) برمجياً:
  - [`eslint.config.mjs`](file:///d:/my-projects/Qalam/eslint.config.mjs): يمنع استيراد أي مكتبة أو إطار عمل خارجي (`next`, `@supabase`, `@anthropic-ai`, إلخ) داخل طبقتي `domain` و `application`.
- [x] إعداد أداة الاختبارات التلقائية [`vitest.config.ts`](file:///d:/my-projects/Qalam/vitest.config.ts) وأداة تنسيق الكود [`.prettierrc`](file:///d:/my-projects/Qalam/.prettierrc) وتجاهل الملفات [`.gitignore`](file:///d:/my-projects/Qalam/.gitignore).
- [x] تجهيز مجلدات خدمات C++ المستقبلية (`services/evaluator`, `services/graph-engine`, `services/spaced-repetition`, `services/adaptation-engine`).

---

### 2. بناء طبقة الـ Domain الصرفة (الخطوة 0.2)
- [x] **كائنات القيمة (Value Objects):**
  - [`identifiers.ts`](file:///d:/my-projects/Qalam/packages/domain/src/value-objects/identifiers.ts): معرّفات بأنواع فريدة (Branded Types) مثل `ConceptId`, `LessonId`, `ModuleId`, `PathId`, `LearnerId`, `ExerciseId` تمنع تمرير معرّف مكان آخر بالخطأ.
  - [`video-segment.ts`](file:///d:/my-projects/Qalam/packages/domain/src/value-objects/video-segment.ts): كائن غير قابل للتعديل يمثل مقطع الفيديو، يتحقق من صلاحية الثواني ويولّد روابط يوتيوب المضمّنة الآمنة.
  - [`mastery-state.ts`](file:///d:/my-projects/Qalam/packages/domain/src/value-objects/mastery-state.ts): يمثل مستويات الإتقان (`not_started`, `studying`, `mastered`, `needs_review`) ودرجة الثقة ومواعيد المراجعة المتباعدة.
- [x] **الكيانات (Entities):**
  - [`concept.ts`](file:///d:/my-projects/Qalam/packages/domain/src/entities/concept.ts): المفهوم التعليمي وربطه بمتطلبات سابقة (Prerequisites Graph).
  - [`lesson.ts`](file:///d:/my-projects/Qalam/packages/domain/src/entities/lesson.ts): الدرس ومقطع الفيديو، مع حفظ حقوق صانع المحتوى (القناة والمصدر).
  - [`module.ts`](file:///d:/my-projects/Qalam/packages/domain/src/entities/module.ts): الوحدة التعليمية التي تجمع عدة دروس بترتيب منطقي.
  - [`learning-path.ts`](file:///d:/my-projects/Qalam/packages/domain/src/entities/learning-path.ts): المسار التعليمي الشامل المرتب وفق الوحدات.
  - [`learner.ts`](file:///d:/my-projects/Qalam/packages/domain/src/entities/learner.ts): المتعلّم ومعلوماته وأهدافه وساعاته المتاحة ومستواه.
- [x] **خدمات النطاق (Domain Services):**
  - [`adaptation-rules.ts`](file:///d:/my-projects/Qalam/packages/domain/src/services/adaptation-rules.ts): منطق صرف يحدد متى ينتقل الطالب للمفهوم التالي، ومتى يُوصى بمراجعة أو درس بديل عند التعثر.
- [x] **اختبارات الوحدة لطبقة النطاق:**
  - [`video-segment.test.ts`](file:///d:/my-projects/Qalam/packages/domain/src/value-objects/video-segment.test.ts) (4 اختبارات).
  - [`adaptation-rules.test.ts`](file:///d:/my-projects/Qalam/packages/domain/src/services/adaptation-rules.test.ts) (3 اختبارات).

---

### 3. بناء طبقة التطبيق والمنافذ وأول Use Case (الخطوة 0.3)
- [x] **المنافذ (Ports - Interfaces):**
  - [`path-repository.port.ts`](file:///d:/my-projects/Qalam/packages/application/src/ports/path-repository.port.ts): عقد عمليات حفظ واسترجاع المسارات.
  - [`learner-repository.port.ts`](file:///d:/my-projects/Qalam/packages/application/src/ports/learner-repository.port.ts): عقد عمليات المتعلّمين.
- [x] **حالات الاستخدام (Use Cases):**
  - [`get-learning-path.usecase.ts`](file:///d:/my-projects/Qalam/packages/application/src/use-cases/get-learning-path.usecase.ts): استرجاع مسار تعليمي مع تفاصيل وحداته ودروسه عبر حقن التبعيات.
- [x] **اختبارات طبقة التطبيق:**
  - [`get-learning-path.usecase.test.ts`](file:///d:/my-projects/Qalam/packages/application/src/use-cases/get-learning-path.usecase.test.ts): اختبار باستخدام مستودع ذاكرة وهمي (In-Memory Fake) بدون شبكة أو قاعدة بيانات (2 اختباران).

---

### 4. قاعدة البيانات ومحوّلات التخزين (الخطوة 0.4)
- [x] **مخطط قاعدة بيانات PostgreSQL / Supabase:**
  - [`001_initial_schema.sql`](file:///d:/my-projects/Qalam/packages/infrastructure/src/persistence/migrations/001_initial_schema.sql): إنشاء 7 جداول مترابطة بعلاقات ومحددات سلامة، مع تفعيل كامل لأمان مستوى الصفوف (**RLS - Row Level Security**) لضمان خصوصية بيانات كل متعلم.
- [x] **محوّلات التخزين بالذاكرة (In-Memory Adapters):**
  - [`in-memory-path.repository.ts`](file:///d:/my-projects/Qalam/packages/infrastructure/src/persistence/in-memory-path.repository.ts): محوّل سريع للاختبارات والتطوير المحلي.
  - [`in-memory-learner.repository.ts`](file:///d:/my-projects/Qalam/packages/infrastructure/src/persistence/in-memory-learner.repository.ts).

---

### 5. عقد JSON لمحرّك C++ المعزول (الخطوة 0.7)
- [x] [`docs/evaluator-contract.md`](file:///d:/my-projects/Qalam/docs/evaluator-contract.md):
  - مواصفة تفصيلية لنقطة النهاية `POST /evaluate`.
  - تفاصيل معايير الحكم (`accepted`, `wrong_answer`, `compile_error`, `time_limit_exceeded`, `runtime_error`).
  - تشخيص الأخطاء ومساعدة الوكيل الذكي على كشف المفاهيم الخاطئة.
  - اشتراطات الأمان الأربعة لمنع أي اختراق أو هجمات Fork Bombs.

---

### 6. مسار تجريبي مصغّر وبيانات البذور (الخطوة 0.8)
- [x] [`seed-data.ts`](file:///d:/my-projects/Qalam/packages/infrastructure/src/persistence/seed-data.ts): مسار أولي متكامل يضم:
  - 5 مفاهيم متسلسلة (المتغيرات ← العمليات ← الشروط ← الحلقات ← الدوال).
  - وحدتان دراسيتان و4 دروس حقيقية مع روابط يوتيوب ومقاطع محددة بالثواني وقنوات موثقة.
- [x] [`in-memory-path.repository.test.ts`](file:///d:/my-projects/Qalam/packages/infrastructure/src/persistence/in-memory-path.repository.test.ts): اختبار تكاملي للبيانات والمستودع.

---

### 7. خط سير الفحص الآلي المستمر CI (الخطوة 0.9)
- [x] [`.github/workflows/ci.yml`](file:///d:/my-projects/Qalam/.github/workflows/ci.yml): تشغيل تلقائي لفحص ESLint وبناء TypeScript واختبارات Vitest عند كل Push أو Pull Request.

---

### 8. واجهة Next.js بـ RTL و Composition Root (الخطوة 0.5)
- [x] `apps/web`: Next.js 15 + React 19 + Tailwind 4، مع `<html lang="ar" dir="rtl">` وخط IBM Plex Sans Arabic.
- [x] `src/app/globals.css`: رموز الهوية المؤقتة (ألوان وخط) في مكان واحد قابل للتغيير لاحقاً.
- [x] `src/composition/container.ts`: Composition Root الوحيد؛ يربط InMemoryPathRepository بـ GetLearningPathUseCase ويحمّل البذرة.
- [x] `src/app/page.tsx`: صفحة تعرض المسار والوحدات والدروس مع اسم القناة ورابط المصدر، بلا منطق عمل.
- [x] `next.config.mjs` و`postcss.config.mjs` و`tsconfig.json` للواجهة؛ سكربتات build/dev تشغّل `tsc --build` أولاً لأن الحزم تُستهلك من dist.
- [x] `.claude/launch.json`: إعداد تشغيل المعاينة المحلية (المنفذ 3111).
- التحقق: lint نظيف، 10 اختبارات ناجحة، `next build` ناجح، والصفحة عُرضت يدوياً بالعربية RTL.

#### إعادة تصميم الواجهة (بناءً على ملاحظة المالك)
- [x] تثبيت إضافة `frontend-design` على مستوى المشروع (`.claude/settings.json`) من دليل Anthropic المدمج، لأن إضافة المستودع `anthropics/claude-code` فشل استنساخها بسبب انقطاع الشبكة. ملاحظة: الإضافة تُحمَّل في الجلسات الجديدة؛ طبّقتُ إرشادات SKILL.md يدوياً في هذه الجلسة.
- [x] هوية «حبر على ورق»: أحبر بترولي + ورق بارد + قلم تمييز عنبري؛ خط Noto Kufi Arabic للعناوين وIBM Plex Sans Arabic للنص.
- [x] عنصر التصميم المميز: «خط التمييز» (`.stroke-list` في `globals.css`) يربط الخطوات والوحدات لأن المحتوى تسلسل فعلي.
- [x] صفحة رئيسية عامة غير مرتبطة بلغة أو مجال (تعرض قائمة المسارات)، وصفحة مسار `/paths/[pathId]`، وتخطٍّ إلى المحتوى، وتركيز مرئي، واحترام `prefers-reduced-motion`، وعدّ عربي صحيح (مفرد/مثنى/جمع).
- [x] `ListLearningPathsUseCase` + `totalDurationSeconds` في Domain، مع 4 اختبارات جديدة (المجموع 14 اختباراً ناجحاً). ملاحظة: بذرة المسار ما زالت C++؛ تُستبدل بمسار Python في الخطوة 0.8.

---

## 🗂️ خريطة ملفات المشروع التي تم إنشاؤها

```
Qalam/
├── .github/
│   └── workflows/
│       └── ci.yml                               # خط أنابيب الفحص الآلي المستمر
├── apps/
│   └── web/
│       └── package.json                         # واجهة الويب (Next.js)
├── packages/
│   ├── domain/                                  # 1. طبقة النطاق
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                         # التصدير الموحّد
│   │       ├── value-objects/
│   │       │   ├── identifiers.ts               # معرّفات Branded Types
│   │       │   ├── video-segment.ts             # مقطع الفيديو المحدود بالزمن
│   │       │   ├── video-segment.test.ts        # اختبارات المقطع
│   │       │   └── mastery-state.ts             # حالة الإتقان والمراجعة
│   │       ├── entities/
│   │       │   ├── concept.ts                   # كيان المفهوم
│   │       │   ├── lesson.ts                    # كيان الدرس
│   │       │   ├── module.ts                    # كيان الوحدة
│   │       │   ├── learning-path.ts             # كيان المسار
│   │       │   └── learner.ts                   # كيان المتعلّم
│   │       └── services/
│   │           ├── adaptation-rules.ts          # قواعد التكيّف الصرفة
│   │           └── adaptation-rules.test.ts     # اختبارات التكيّف
│   ├── application/                             # 2. طبقة التطبيق
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ports/
│   │       │   ├── path-repository.port.ts      # منفذ مستودع المسارات
│   │       │   └── learner-repository.port.ts   # منفذ مستودع المتعلمين
│   │       └── use-cases/
│   │           ├── get-learning-path.usecase.ts # حالة استخدام جلب المسار
│   │           └── get-learning-path.usecase.test.ts
│   └── infrastructure/                          # 3. طبقة البنية التحتية
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── persistence/
│               ├── in-memory-path.repository.ts # مستودع الذاكرة للمسارات
│               ├── in-memory-path.repository.test.ts
│               ├── in-memory-learner.repository.ts
│               ├── seed-data.ts                 # بيانات المسار الأولي
│               └── migrations/
│                   └── 001_initial_schema.sql   # مخطط قاعدة بيانات Supabase + RLS
├── services/                                    # 4. خدمات C++ للأداء العالي
│   ├── evaluator/README.md                      # تشغيل كود الطالب (محرّك التقييم)
│   ├── graph-engine/README.md                   # خوارزميات الـ concept graph
│   ├── spaced-repetition/README.md              # حسابات المراجعة المتباعدة
│   └── adaptation-engine/README.md              # محرك قواعد التكيّف على نطاق واسع
├── docs/
│   ├── SPEC.md                                  # الوثيقة المرجعية للمشروع
│   ├── evaluator-contract.md                    # عقد JSON لمحرّك C++
│   └── IMPLEMENTATION_LOG.md                    # (هذا الملف) سجل التنفيذ
├── CLAUDE.md                                    # تعليمات وقواعد المشروع
├── package.json                                 # إعدادات Monorepo
├── tsconfig.base.json                           # إعدادات TypeScript المشتركة
├── tsconfig.json                                # إعدادات مراجع المشاريع
├── eslint.config.mjs                            # فحص الجودة والعمارة النظيفة
├── vitest.config.ts                             # إعدادات الاختبارات
├── .prettierrc                                  # تنسيق الكود
└── .gitignore                                   # استثناءات Git
```

---

## ⏳ ما تبقى من المرحلة 0 (الخطوات القادمة)

- [x] **0.5 — هيكل واجهة RTL + Composition Root:** مكتمل (انظر القسم 8).
- [x] **0.6 — مشغّل يوتيوب (مكتمل):** `components/youtube-player.tsx` (iframe رسمي بـ start/end مع القناة ورابط المصدر)، وصفحة الدرس `/paths/[pathId]/lessons/[lessonId]` مع السابق والتالي، و`GetLessonUseCase` (+3 اختبارات؛ المجموع 17). تحقق يدوي: رابط التضمين `?start=425&end=780`. التنقل في صفحة المسار يربط كل درس بصفحته.
- [x] **0.10 — المصادقة (مكتملة، التحقق المحلي فقط):** `Email` (Domain)، `AuthPort` + `RequestSignIn/GetCurrentUser/SignOut` (Application)، محوّلان: `SupabaseAuth` (رابط سحري) و`DevCookieAuth` (دخول تطويري فوري، يُعطَّل في الإنتاج). الواجهة: `/login` و`/auth/callback` وزر الخروج في الترويسة و`middleware.ts` لتجديد الجلسة، وصفحات الدروس محمية. `safeRedirectPath` يمنع إعادة التوجيه المفتوحة (مع اختبار). `.env.example` للمفاتيح. **لم يُجرَّب مع مشروع Supabase حقيقي** (لا توجد مفاتيح)؛ جُرّب مسار الدخول التطويري يدوياً: دخول ← إعادة توجيه ← الدرس ← خروج.
- [x] **0.11 — محوّل Supabase للمسارات:** `SupabasePathRepository` (قراءة بمفتاح anon، حفظ بمفتاح الخدمة) و`mapPathRow` مع اختبارات بعميل وهمي، والهجرة `002_lesson_order_and_events.sql` (عمود `order_index` للدروس + جدول `learning_events` مع RLS). `container.ts` يختار Supabase عند توفر المفاتيح وإلا الذاكرة+البذرة. **لم تُشغَّل الهجرات على قاعدة حقيقية بعد.**
- [x] **0.12 — أحداث قياس الأثر:** `LearningEvent` (Domain؛ قرار الخطة يشترط سببه)، `EventRecorderPort` و`ClockPort` و`RecordLearningEventUseCase`، ومحوّلا الذاكرة وSupabase. الواجهة تسجّل `lesson_opened` عند فتح الدرس و`lesson_completed` من زر «أكملت الدرس» (انتقال للدرس التالي).
- [x] **0.8 (بذرة المحتوى) — مكتملة تقنيًا، بانتظار مراجعة المالك (2026-10-27):** اعتمد المالك قائمة Programming Advices كأحد كورسات المنصة (المنصة عامة وليست للبرمجة وحدها). استُبدلت بذرة C++ بمسار «أساسيات الحاسوب للمبرمج»: 3 وحدات، 13 درسًا، 10 مفاهيم بمتطلبات سابقة، في `seed-data.ts`. المعرّفات والمدد قُرئت من يوتيوب (خلاصة RSS وصفحات المشاهدة)، وكل مقطع = الفيديو كاملًا (0 → المدة)، والملخصات مشتقة من العناوين، و**`reviewedByHuman: false` لكل الدروس**. استُبعد الفيديوان التمهيديان (مقدمة السلسلة وإعلان المنصة). عُدّل `in-memory-path.repository.test.ts` ليتحقق من 3 وحدات و13 درسًا و10 مفاهيم وأن لا درس مُراجَع. التحقق: `tsc --build` ولينت نظيفان و35 اختبارًا ناجحًا؛ لم تُفحص الواجهة في المتصفح. **قرار معماري جديد:** ستُبنى لوحة تحكم إدارية (إدارة المسارات والدروس والمفاهيم ووسم المراجعة البشرية) بعد المرحلة 1، وعندها تنتقل البذرة إلى بيانات تُدار من اللوحة.
- [x] **تغيير الخط (2026-10-27):** استُبدل Noto Kufi + IBM Plex بخط **مدى (Mada)** الهندسي النظيف (OFL) عبر `next/font/google` في `apps/web/src/app/layout.tsx`، ورمزا `--font-sans` و`--font-display` في `globals.css` يشيران إليه. خط STC Forward الأصلي تجاري وغير موجود في مجموعة الخطوط، فاخترنا الأقرب مفتوح الترخيص. لم تُنسخ ملفات من مجموعة الخطوط إلى المشروع. التحقق: الخط يُحمَّل (400–900) في المتصفح، ولا أخطاء في الكونسول، واللينت نظيف.
- [x] **لوحة التحكم الإدارية (2026-10-27):** إدارة المسارات والوحدات والدروس والمفاهيم من الواجهة، بدل ملف البذرة.
  - **Domain:** `parseYouTubeVideoId` و`parseTimecode` و`formatTimecode` و`toWatchUrl` (`value-objects/youtube.ts`)، `AdminPolicy` (قائمة بريد؛ الافتراض الرفض)، `wouldCreateCycle` (منع دورات المتطلبات)، وطرق التعديل: `Lesson.update` و`Module.{updateDetails,withOrderIndex,replaceLesson,removeLesson,moveLesson,findLesson}` و`LearningPath.{updateDetails,replaceModule,removeModule,moveModule,findModule,findLesson,nextModuleOrderIndex}` و`Concept.update`.
  - **Application:** منفذان جديدان `ConceptRepositoryPort` و`IdGeneratorPort`، و`PathRepositoryPort.delete`، وأخطاء `UnauthenticatedError/ForbiddenError/NotFoundError`، و19 use case في `use-cases/admin/` (مسارات، وحدات، دروس، مفاهيم، `CheckAdmin`). كل use case يتحقق من المدير بنفسه عبر `requireAdmin`، فلا تعتمد الحماية على إخفاء الصفحات. قاعدة جودة: أي تعديل على محتوى الدرس يسحب «مراجعة بشرية»، ولا يمنحها إلا `SetLessonReviewUseCase`. حذف المفهوم محظور إن ارتبط بدرس أو كان متطلبًا لمفهوم آخر.
  - **Infrastructure:** `InMemoryConceptRepository`، `SupabaseConceptRepository`، `randomIdGenerator`، `createSupabaseServiceClient`، وحذف في `SupabasePathRepository` (حذف المسار، وتنظيف الدروس والوحدات المُزالة عند `save` لأن upsert لا يحذف).
  - **Web:** `/admin` (المسارات + إنشاء)، `/admin/paths/[pathId]` (بيانات المسار، وحدات، دروس: ترتيب ▲▼، إضافة/تعديل/حذف)، `/admin/paths/[pathId]/lessons/[lessonId]` (معاينة المقطع + زر «شاهدت المقطع وأعتمد الدرس» + تعديل)، `/admin/concepts`. إجراءات الخادم في `admin/actions.ts` تحوّل النموذج إلى use cases وتعيد الأخطاء برسالة عربية. Composition Root: `composition/admin.ts`؛ ومخزن الذاكرة صار على `globalThis` ويتشاركه العام والإدارة (`getLocalStore`). رابط «لوحة التحكم» في الترويسة للمدير فقط.
  - **الإعداد:** `ADMIN_EMAILS` (مديرون بالبريد) و`SUPABASE_SERVICE_ROLE_KEY` (للكتابة على Supabase، على الخادم فقط) في `.env.example`. في التطوير بلا Supabase وبلا `ADMIN_EMAILS` يُعامل أي مستخدم مسجَّل كمدير؛ في الإنتاج بلا القائمة لا يدخل أحد.
  - **التحقق:** 65 اختبارًا ناجحًا (كانت 35)، `tsc` ولينت نظيفان، `next build` ناجح. جُرّب في المتصفح (وضع الذاكرة): إنشاء مسار ← وحدة ← درس، رفض رابط غير صالح برسالة عربية، اعتماد الدرس ثم سحبه تلقائيًا عند تعديل العنوان، ظهور الدرس في الصفحة العامة، حذف المسار؛ وبقي مسار «أساسيات الحاسوب» سليمًا (مراجَع 0 من 13).
  - **غير مُجرَّب:** مسار Supabase للوحة (لا مفاتيح): الكتابة بمفتاح الخدمة، وحذف الأيتام، ومحوّل المفاهيم؛ اختُبرت بعميل وهمي فقط. يلزم أيضًا بذر جدول `concepts` في Supabase قبل إضافة الدروس (سكربت البذر لم يُكتب بعد). وصلاحية المدير في وضع Supabase تعتمد على `ADMIN_EMAILS` فقط، بلا جدول أدوار.
- [x] **المرحلة 1 — تتبع الإكمال في الواجهة (2026-10-27):** التقدم يُحسب من أحداث `lesson_completed` المسجَّلة فعلًا (لا من فتح الدرس).
  - **Domain:** `calculatePathProgress` (`services/path-progress.ts`): المكتمل، العدد، النسبة، والدرس التالي (أول غير مكتمل بترتيب المسار)؛ لا يعدّ المكرر ولا دروس مسارات أخرى.
  - **Application:** `EventReaderPort` (منفصل عن المسجِّل) و`GetPathProgressUseCase`.
  - **Infrastructure:** `InMemoryEventRecorder.listByUser` و`SupabaseEventReader` (جدول `learning_events`).
  - **Web:** صفحة المسار تعرض شريط التقدم و«ابدأ المسار/تابع من حيث توقفت» وعلامة «✓ مكتمل» لكل درس (للمسجَّل فقط)، وصفحة الدرس تعرض تقدمه وحالة الإكمال.
  - **التحقق:** 76 اختبارًا ناجحًا، `tsc` ولينت نظيفان؛ في المتصفح: بعد إكمال الدرس الأول ظهر «1 من 13 (8%)» وعلامة واحدة وزر المتابعة يشير إلى الدرس الثاني. قراءة Supabase اختُبرت بعميل وهمي فقط.
  - **المتبقي من المرحلة 1:** الملخصات المولّدة، الاختبارات القصيرة، الاختبار التشخيصي (تحتاج قرارًا بشأن مصدر الأسئلة، انظر CLAUDE.md).
- [x] **أدوات المشروع (2026-10-27):** تثبيت مهارة `find-skills` في `.claude/skills` (بأمر المالك، تقييم Snyk «Med Risk» فقرأتُ ملفها: دليل بحث بلا سكربتات)، وقاعدة استخدامها في CLAUDE.md. وإصلاح ظهور رابط لوحة التحكم لكل المسجَّلين: أُزيل استثناء التطوير «أي مسجَّل مدير» من `AdminPolicy`، فالمديرون من `ADMIN_EMAILS` فقط في كل البيئات (جُرّب: مسجَّل عادي لا يرى الرابط و`/admin` يمنعه، والمدير يراه).
- [x] **المرحلة 1 — الاختبارات القصيرة بالذكاء الاصطناعي (2026-10-27):**
  - **المبدأ:** Claude يولّد **مسودات** أسئلة من «ملاحظات المالك» عن الدرس فقط (لا نفترض نصًا مفرّغًا، تجنبًا للهلوسة)، ولا يرى المتعلم سؤالًا قبل أن يعتمده المالك. تعديل السؤال يعيده مسودة.
  - **Domain:** `QuizQuestion` (3–5 خيارات، مسودة/معتمد، ai/manual)، `gradeQuiz` (الدرجة، النسبة، المفاهيم الضعيفة)، و`Lesson.notes`.
  - **Application:** منفذان `LlmClient` و`QuestionRepositoryPort`؛ use cases إدارية: `GenerateQuestions` (يرفض بلا ملاحظات، ويتحقق من ردّ النموذج بمخطط، ويرفض الدفعة كلها عند أي مخالفة) و`AddQuestion` و`ApproveQuestion` و`UpdateQuestion` و`DeleteQuestion` و`ListLessonQuestions`؛ وللمتعلم `GetLessonQuiz` (بلا الإجابة الصحيحة) و`SubmitQuiz` (يصحّح ويسجّل حدث `attempt_submitted` بالمفاهيم الضعيفة) و`GetQuizResult`.
  - **Infrastructure:** `AnthropicLlmClient` على حزمة `@anthropic-ai/sdk` الرسمية: النموذج `claude-opus-5-5` (قابل للتغيير بـ `ANTHROPIC_MODEL`)، structured outputs، `effort: medium`، و`fallbacks: "default"` (فعّلتُه افتراضيًا وفق دليل Claude API لأن هذا النموذج قد يرفض أمنيًا)، ولا `temperature`/prefill/`tool_choice` إجباري. مستودعا الأسئلة (ذاكرة وSupabase)، والهجرة `003_lesson_notes_and_quiz_questions.sql` (عمود `notes` وجدول `quiz_questions` بسياسة RLS تمنع القراءة المباشرة: التصحيح في الخادم بمفتاح الخدمة).
  - **Web:** صفحة الدرس الإدارية: حقل الملاحظات، زر «ولّد أسئلة بالذكاء الاصطناعي»، إضافة سؤال يدويًا، وتعديل/اعتماد/حذف. صفحة الدرس للمتعلم: قسم «اختبر فهمك»، وصفحة `/quiz` للنتيجة مع الشرح.
  - **التحقق:** 95 اختبارًا ناجحًا، `tsc` ولينت نظيفان. في المتصفح (بلا مفتاح Claude): الزر معطّل بلا ملاحظات؛ التوليد بلا مفتاح يفشل برسالة عربية واضحة؛ سؤال يدوي ← مسودة لا يراها المتعلم ← اعتماد ← يظهر للمتعلم دون تسرّب الإجابة في HTML ← تسليم خاطئ ← نتيجة 0/1 مع الصحيحة والشرح.
  - **غير مُجرَّب:** استدعاء Claude الحقيقي (لا مفتاح): المحوّل اختُبر بعميل وهمي يتحقق من المعاملات المرسلة وترجمة الأخطاء فقط، ولم تُراجَع جودة الأسئلة المولّدة فعليًا. ومسار Supabase للأسئلة (وتشغيل الهجرة 003).
  - **المتبقي:** الاختبار التشخيصي، والملخصات المولّدة، وإظهار نتائج الاختبارات في التقدم.
- [x] **مزوّد Gemini المجاني (2026-10-27):** المالك لا يستطيع تكلفة Claude API ولديه اشتراك Google AI Pro. تحققتُ من وثائق Google: الاشتراك **لا يشمل** الـ API، لكن مفتاح Gemini API مجاني من Google AI Studio (بلا بطاقة) ونماذج Flash مجانية في الفئة المجانية، وتحذّر الوثائق من أن محتوى الفئة المجانية يُستعمل لتحسين منتجات Google (نرسل عنوان الدرس وملاحظات المالك فقط، لا بيانات متعلمين). أُضيف `GeminiLlmClient` خلف نفس منفذ `LlmClient` (REST `generateContent`، المفتاح في ترويسة `x-goog-api-key`، النموذج الافتراضي `gemini-3.8-flash` الموصى به في الوثائق، قابل للتغيير بـ `GEMINI_MODEL`)، والمخطط يُرسل في تعليمات النظام مع `responseMimeType=application/json` بدل `responseSchema` لتجنب اختلاف صيغة المخطط، ويبقى التحقق في الـ use case. اختيار المزوّد في `composition/llm.ts`: `LLM_PROVIDER` صريح، وإلا `GEMINI_API_KEY` ثم `ANTHROPIC_API_KEY`. محوّل Claude باقٍ كبديل مدفوع. اختبارات المحوّل بـ fetch وهمي (100 اختبار ناجح، tsc ولينت نظيفان). **لم يُجرَّب استدعاء Gemini الحقيقي** (لا مفتاح بعد)، ولم تُراجَع جودة الأسئلة العربية.
- [x] **مسودات الملاحظات من الفيديو + متانة Gemini + حفظ محلي (2026-10-28):**
  - **اكتشاف:** مفتاح Gemini يعمل (جُرّب فعليًا)، لكن نماذج Flash المجانية تتعرض لـ503 «high demand» بشكل متقطع، و`gemini-2.5-flash` مغلق للحسابات الجديدة. فأصبح `GeminiLlmClient` يجرّب قائمة نماذج (`gemini-3.8-flash` ثم `3.6-flash` ثم `3.1-flash-lite`، قابلة للتغيير بـ `GEMINI_MODEL` مفصولة بفواصل) وينتقل للتالي عند 503/429/404/مهلة، ويتوقف فورًا عند خطأ المفتاح أو الحجب الأمني، مع مهلة 45ث (120ث للفيديو).
  - **توليد الأسئلة الحقيقي جُرّب:** من ملاحظات قصيرة عن «البيانات والمعلومات» أعاد Gemini 3 أسئلة عربية سليمة (4 خيارات، صحيحة بتوزيع متنوع، شروح مستندة للملاحظات). لوحظ سؤال واحد يقول «وفقًا لما ورد في المصدر»، فشُدّد المطلوب في التعليمات (يُمنع ذكر المصدر داخل السؤال).
  - **`LlmClient.describeVideo` (اختياري، Gemini فقط):** يقرأ مقطع فيديو يوتيوب العام عبر رابطه ونطاقه الزمني (`file_data` + `video_metadata`) ويعيد نصًا؛ لا ننسخ الفيديو ولا نعيد استضافته ولا نفترض نصًا مفرّغًا. `DraftLessonNotesUseCase` يحفظ الناتج كـ«ملاحظات» مسودة ويُسقط اعتماد المراجعة؛ يرفض إن وُجدت ملاحظات، أو كان المزوّد لا يقرأ الفيديو. زر «ولّد مسودة الملاحظات من الفيديو» في صفحة الدرس الإدارية.
  - **حفظ محلي:** المخزن المحلي صار يُحفظ كلقطة JSON (`apps/web/.data/local-store.json`، مستثناة من git) بعد كل تعديل ويُقرأ عند البدء، فلا تضيع المسودات والاعتمادات عند إعادة تشغيل الخادم (`local-snapshot.ts`، ذهابًا وإيابًا مُختبر). ليست بديلًا عن Supabase في الإنتاج.
  - **سكربت `npm run draft-content`:** يولّد ملاحظات وأسئلة مسودة لكل الدروس (يُستأنف ولا يعيد ما اكتمل، ويعيد المحاولة عند الضغط). لا يعتمد أي درس ولا سؤال.
  - **الاختبارات:** 107 ناجحة، `tsc` ولينت نظيفان.
- [x] **الاختبار التشخيصي + تخطي الدروس (2026-10-28):**
  - **القاعدة (SPEC §7):** يُتخطى مفهوم فقط إذا أُجيب **كل** أسئلته التشخيصية صحيحًا ويلزم سؤالان معتمدان عنه على الأقل (سؤال واحد قد يُصاب بالتخمين). الأسئلة معتمدة فقط، حتى سؤالين لكل مفهوم بترتيب المسار (`services/diagnostic.ts`).
  - **Application:** `GetDiagnostic` (بلا إجابات) و`GetDiagnosticResult` (تصحيح بلا تسجيل) و`SubmitDiagnostic`: يسجّل `diagnostic_completed` ثم `plan_decision` لكل درس متخطى **مع سببه** («أجبتَ صحيحًا على سؤالين عن «…» في الاختبار التشخيصي»)، تطبيقًا لمبدأ «لماذا اقترحت هذا؟».
  - **التقدم:** `calculatePathProgress` يعدّ المتخطى بقرار خطة في النسبة لكن **ليس «مكتملًا»** (لئلا تتضخم أرقام الأثر)، والإكمال الفعلي أقوى من التخطي، ويتخطاه «الدرس التالي».
  - **Web:** `/paths/[pathId]/diagnostic` (أسئلة ثم نتيجة وقراراتها)، وزر «اختبار تشخيصي» في صفحة المسار قبل البدء وعند توفر أسئلة معتمدة، وشارة «تم تخطيه».
  - **التحقق:** 116 اختبارًا ناجحًا، `tsc` ولينت نظيفان. في المتصفح على نسخة بيانات اختبارية معزولة (حُذفت بعدها، ولم يُعتمد أي سؤال في بياناتك): 2 من 4 ← تخطّى الدرس الأول بسببه وأبقى الثاني ← التقدم 8% وشارة التخطي والدرس التالي هو الثاني وأُخفي زر التشخيصي.
  - **ملاحظة اختبار:** تسجيل الدخول التطويري يُفقد عند إعادة تحميل الخادم الساخنة (Fast Refresh) أثناء التطوير؛ ليس خللًا في الميزة.
- [x] **المرحلة 3 — النسخة الأولى من وكيل التعلّم (2026-10-28):** (بحثتُ بـ`npx skills find` فلم أجد مهارة مناسبة؛ نفّذتُ مباشرة.)
  - **Domain:** `services/learning-agent-rules.ts` → `decideNextStep(path, events)` نقية وحتمية. القواعد: آخر محاولة اختبار فاشلة (النجاح ≥ 70%) تحجب التقدّم؛ فشل واحد ← `retake_quiz`، فشلان متتاليان ← `review_lesson` (مثال SPEC §7)، ثلاثة فأكثر ← `alternative_lesson` (درس آخر على نفس المفهوم، وإلا مراجعة الدرس)؛ النجاح يمسح السلسلة؛ وبلا حجب ← `proceed` إلى أول درس غير مكتمل ولا متخطى (null إذا انتهى المسار). لكل قرار `reason` عربي و`evidenceKey` (بصمة الأدلة).
  - **Application:** `agent/learning-agent.ts` (`LearningAgent.run/history`): observe (المسار + أحداث الإكمال والمحاولات والتشخيصي وقرارات الخطة) ← decide (Domain) ← act ← record. الشرح عبر `LlmClient` اختياري (`agent/decision-explanation.ts`: مخطط + تحقق، ويُهمل أي ردّ مخالف أو خطأ بصمت)، ولا يُستدعى عند `proceed`. القرار يُسجَّل حدث `plan_decision` (`source: 'agent'`) بسببه وشرحه، ولا يتكرر لنفس `evidenceKey`؛ والطلبات المتزامنة لنفس المتعلم والمسار تُنفَّذ بالتسلسل (اكتُشف تسجيل مزدوج أثناء التحقق وأُصلح، مع اختبار).
  - **Web:** `learningAgent` في Composition Root؛ `submitQuizAction` يشغّل الوكيل بعد التسليم (فشله لا يمنع النتيجة)؛ صفحة المسار تعرض بطاقة «اقتراح وكيل التعلّم» + «لماذا اقترحنا هذا؟» + «اقتراحات سابقة». `getAgentLlmClient` يحدّ الشرح بمهلة 8 ثوانٍ، وبلا مفتاح يعمل الوكيل بالقواعد وحدها.
  - **التحقق:** 137 اختبارًا ناجحًا (21 جديدًا: قاعدة ← قرار متوقع لكل قاعدة، وحلقة الوكيل مع نموذج وهمي)، `tsc` ولينت نظيفان. في المتصفح على مخزن بيانات اختباري معزول (خارج مخزنك): فشل أول ← إعادة اختبار، فشل ثانٍ ← «مراجعة الدرس» مع السبب والسجل السابق.
  - **حدود معروفة:** (1) شرح Gemini لم يظهر في التجربة لأن الاستدعاء تجاوز مهلة 8ث (سلسلة النماذج المجانية بطيئة)، فالشرح الاختياري غائب هنا؛ لم تُراجَع جودته. (2) التسلسل بين الطلبات داخل العملية فقط؛ مع عدة نسخ خادم يلزم قيد فريد في Supabase. (3) لا يستخدم الوكيل بعد المراجعة المتباعدة ولا نتائج التمارين (المرحلتان 2 و3 لاحقًا). (4) لم يُجرَّب مسار Supabase للقرارات.
- [x] **مراجعة متباعدة + نتائج الاختبارات في التقدم + نقل المحتوى إلى Supabase (2026-10-28):**
  - **المراجعة المتباعدة (Domain):** `decideNextStep(path, events, now?)` يضيف القرار `spaced_review`: درس اجتاز اختباره (≥70%) وحان موعد مراجعته بفواصل 1، 3، 7، 14، 30 يومًا حسب عدد أيام النجاح المختلفة؛ الأكثر تأخرًا أولًا، ويأتي بعد قاعدة الفشل وقبل التقدّم. بدون `now` لا تُطبَّق (يمرّره الوكيل من `ClockPort`). فشل المراجعة يعود لقاعدة إعادة الاختبار. 6 اختبارات.
  - **التقدم:** `quizPercentByLesson` (آخر نسبة لكل درس) وشارة «آخر اختبار: X%» في صفحة المسار.
  - **`npm run seed-supabase`** (`scripts/seed-supabase.mjs`): ينقل المفاهيم ثم المسارات ثم الأسئلة إلى Supabase بمفتاح الخدمة من اللقطة المحلية أو البذرة، دون تغيير أي اعتماد. و`docs/DEPLOYMENT.md` بخطوات Supabase وVercel.
  - **التحقق:** 144 اختبارًا ناجحًا، `tsc` ولينت نظيفان، `next build` ناجح. **غير مُجرَّب:** سكربت البذر والنشر (لا مفاتيح Supabase ولا حساب Vercel)، وواجهة المراجعة المتباعدة لم تُفحص في المتصفح.
- (ملاحظة تاريخية عن المرحلة السابقة من 0.8): لا أملك طريقة للتحقق من معرّفات فيديوهات يوتيوب والمقاطع الزمنية، ولن أختلقها لأن الدروس تُعلَّم «مراجعة بشرية». المطلوب: قائمة تشغيل عربية مجانية تغطي المتغيرات والأنواع والعمليات والشروط والحلقات والدوال، لأبني منها 10–15 درساً. المجموع الحالي: 35 اختباراً ناجحاً.
  - **تحديث (2026-10-27):** قدّم المالك قائمة `PL3X--QIIK-OHgMV2yBz3GLfM5d_5BxOSj` (قناة Programming Advices). تبيّن من خلاصة RSS الرسمية أنها «كورس رقم 1: أساسيات مهمة لكل مبرمج» (بيانات/معلومات، مكوّنات الحاسوب، الأنظمة الثنائية والسداسية عشرية، الشبكات، لغات البرمجة...) وليست بايثون. لم تُعدَّل البذرة، وبانتظار قرار المالك. الخلاصة تعطي أول 15 عنصراً فقط، ولا مدد ولا توقيتات مؤكَّدة.
- (النص الأصلي للخطوة 0.6):
  - بناء مكوّن `<YouTubePlayer />` يدعم البداية والنهاية التلقائية وعرض حقوق القناة.
