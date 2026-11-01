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

### 🎨 تبنّي Material Design 3 (واجهة المنصة ولوحة التحكم)
- مهارة جديدة بأمر المالك: `.claude/skills/material-design/SKILL.md` (أدوار لونية، أشكال، طباعة، ارتفاع، طبقات حالة، متغيرات مكوّنات على نمط MUI، RTL، قواعد الـ Admin). كُتبت من معرفة M3/MUI لأن جلب صفحات m3.material.io لم يعطِ نصًا.
- `apps/web/src/app/globals.css`: أدوار M3 (primary/surface-container/outline/error...)، الأسماء القديمة صارت أسماء مستعارة، وفئات `btn-*`, `card-*`, `chip*`, `field`, `nav-item`, `text-*`.
- طُبّقت على: `admin-ui.tsx`، `site-header.tsx`، `admin/layout.tsx`، وكل الصفحات (أزرار، بطاقات، حقول، شارات) بتبديل نصي.
- لم يُتحقق بصريًا: `next build` يفشل بسبب `PENDING_EMAIL_COOKIE` المُصدَّر من ملف `"use server"` في `auth/actions.ts` (تعديل غير مُدمج سابق للمصادقة، لا علاقة له بالتصميم)، وخادم التطوير علّق عند ترجمة `/`.

### 🧭 إعادة هيكلة المنصة: أقسام كاملة بدل قسم المسارات وحده
- مشكلة: كانت المنصة صفحة رئيسية + مسارات فقط. صارت بهيكل منصة عالمية: ترويسة ثابتة بتنقل رئيسي (مع حالة الصفحة الحالية وقائمة للجوال)، وتذييل بثلاثة أعمدة، وعرض أوسع (6xl).
- صفحات جديدة: `/paths` (دليل بحث وتصفية)، `/library` (مكتبة كل الدروس)، `/concepts` (خريطة المفاهيم بمستوياتها ومتطلباتها)، `/dashboard` (تعلّمي: تقدم، متابعة، «يحتاج انتباهك» بأسبابه)، `/review` (اقتراحات المراجعة + دروس نتيجتها < 60%)، `/practice` (صفحة صادقة: قيد البناء، المرحلة 2)، `/about` (كيف يعمل، المصادر والحقوق، الخصوصية)، `/profile`. الرئيسية أُعيد تصميمها (أرقام، بطاقات مسارات، أقسام المنصة).
- Application: `use-cases/catalog.usecases.ts` (`SearchLessonLibraryUseCase`, `GetConceptMapUseCase`, `GetLearnerDashboardUseCase`) مع اختباراتها (8). الوكيل لا يُستدعى في اللوحة إلا للمسارات التي بدأها المتعلم كي لا تُسجَّل قرارات لمسارات لم يفتحها. التركيب في `composition/container.ts`.
- مكوّنات: `components/ui.tsx` (PageHeader, PathCard, ProgressBar, StatTile, EmptyState)، `nav-links.tsx`، `site-footer.tsx`.
- إصلاحات لازمة للبناء: نقل `PENDING_EMAIL_COOKIE` إلى `auth/pending-email.ts`، وحذف مفتاح مكرر في `composition/auth.ts`.
- الحالة: `next build` ينجح، الاختبارات 155 ناجحة، فُحصت بصريًا الرئيسية والمكتبة والمفاهيم. لم تُفحص بصريًا `/dashboard` و`/review` و`/profile` وهي بحالة مسجَّل دخوله.

### إعادة إرسال رمز الدخول بعدّاد (30 ثانية)
- السبب: فاصل Supabase الافتراضي بين رسالتين لنفس البريد 60 ثانية؛ خُفّض إلى 10 ثوانٍ بـ Management API (`smtp_max_frequency`) بعد ربط Resend.
- `auth/actions.ts`: إجراء جديد `resendCodeAction` يعيد الطلب للبريد المحفوظ في ملف الارتباط ويجدّد صلاحيته.
- `components/resend-code-button.tsx` (جديد): زر مع عدّاد تنازلي 30 ثانية يبدأ عند ظهور الصفحة؛ الثابت `COOLDOWN_SECONDS` يجب ألا يقل عن `smtp_max_frequency`.
- `login/page.tsx`: الزر في خطوة إدخال الرمز، ونص رابط التغيير صار «غيّر البريد».
- الحالة: `tsc --noEmit` للواجهة ينجح؛ لم يُجرَّب في المتصفح مع Supabase حقيقي.

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
  - **التحقق:** 144 اختبارًا ناجحًا، `tsc` ولينت نظيفان، `next build` ناجح. **غير مُجرَّب:** سكربت البذر والنشر (لا مفاتيح Supabase ولا حساب Vercel)، وواجهة المراجعة المتباعدة فُحصت لاحقًا على مخزن معزول (محاولة ناجحة قبل 3 أيام ← «مراجعة متباعدة» بسببها وشارة «آخر اختبار: 100%») وصُحّح عدّ الأيام عربيًا. **ملاحظة:** قيم Supabase في `apps/web/.env.local` حاليًا نصوص مؤقتة (`...`) فتكسر الخادم المحلي؛ تُستبدل بالمفاتيح الحقيقية أو تُحذف.
- [x] **إصلاح بناء Vercel (2026-10-28):** فشل أول بناء بـ`tsc: command not found` لأن Vercel ثبّت حزم `apps/web` فقط (72 حزمة) دون `typescript` الموجود في جذر الـ monorepo. أُضيف `apps/web/vercel.json` يجعل التثبيت والبناء من الجذر (`npm install` ثم `tsc --build` ثم `next build`). جُرّب محليًا بعد حذف كل `dist` فنجح البناء. **لم يُعاد النشر بعد.**
- (ملاحظة تاريخية عن المرحلة السابقة من 0.8): لا أملك طريقة للتحقق من معرّفات فيديوهات يوتيوب والمقاطع الزمنية، ولن أختلقها لأن الدروس تُعلَّم «مراجعة بشرية». المطلوب: قائمة تشغيل عربية مجانية تغطي المتغيرات والأنواع والعمليات والشروط والحلقات والدوال، لأبني منها 10–15 درساً. المجموع الحالي: 35 اختباراً ناجحاً.
  - **تحديث (2026-10-27):** قدّم المالك قائمة `PL3X--QIIK-OHgMV2yBz3GLfM5d_5BxOSj` (قناة Programming Advices). تبيّن من خلاصة RSS الرسمية أنها «كورس رقم 1: أساسيات مهمة لكل مبرمج» (بيانات/معلومات، مكوّنات الحاسوب، الأنظمة الثنائية والسداسية عشرية، الشبكات، لغات البرمجة...) وليست بايثون. لم تُعدَّل البذرة، وبانتظار قرار المالك. الخلاصة تعطي أول 15 عنصراً فقط، ولا مدد ولا توقيتات مؤكَّدة.
- (النص الأصلي للخطوة 0.6):
  - بناء مكوّن `<YouTubePlayer />` يدعم البداية والنهاية التلقائية وعرض حقوق القناة.
- [x] **الدخول برمز من 6 أرقام + قالب بريد بهوية قلم (2026-10-29):**
  - **المشكلة:** وصلت 3 رسائل فقط في الساعة وبمرسل «Supabase»: بريد Supabase الافتراضي محدود الحصة وغير منسوب للمنصة، والرابط السحري لا يناسب المتعلم.
  - **الكود:** `AuthPort` صار `requestSignInCode` و`verifySignInCode` بدل `sendMagicLink`. حالة استخدام جديدة `VerifySignInCodeUseCase` تشترط 6 أرقام (وتزيل المسافات) قبل سؤال المنفذ. `SupabaseAuth` يستعمل `signInWithOtp` بلا `emailRedirectTo` (فيُرسل رمز `{{ .Token }}`) ثم `verifyOtp({type:'email'})`. الواجهة: `/login` بخطوتين (البريد ثم الرمز) والبريد المنتظر في ملف ارتباط `qalam_pending_email` (httpOnly، 10 دقائق) لا في الرابط، وزر «غيّر البريد أو اطلب رمزًا جديدًا». حُذف `/auth/callback` لعدم الحاجة إليه. الدخول التطويري يبقى فوريًا.
  - **القالب:** `docs/email-templates/login-code.html` (RTL، ألوان «حبر على ورق»، الرمز في ورقة بخط تمييز أصفر، تنسيق مضمّن للتوافق مع عملاء البريد).
  - **ما يلزم من المالك (خارج الكود):** تفعيل Custom SMTP عبر Resend باسم مرسل «قلم»، ولصق القالب في Supabase، وضبط OTP Length=6 — الخطوات في `docs/DEPLOYMENT.md`. بدونها يبقى الحد الساعي الصغير وبقاء المرسل «Supabase Auth»، فهذان إعدادان في لوحة Supabase لا في الكود.
  - **التحقق:** 147 اختبارًا ناجحًا، `tsc` ولينت نظيفان. **غير مُجرَّب مع Supabase حقيقي** (خطوة الرمز لا تظهر في الوضع التطويري)، ولم يُعاين القالب في عملاء بريد فعلية.
- [x] **هوية قلم البصرية + لودينق الانتقال (2026-10-29):**
  - بحثتُ بـ`npx skills find` (brand-identity: 510 تثبيت، loading-states: 2) فلم تبلغ حدّ الجودة ولم أثبّت شيئًا؛ نُفّذ بمهارتي `frontend-design` و`material-design` الموجودتين.
  - **الهوية:** قلم قصب بسنّ مائل يترك خطًّا عنبريًا (يطابق خط التقدم). `components/brand.tsx` (`QalamMark`, `QalamLogo`, `QalamLoader`)، `app/icon.svg`، الشعار في الهيدر والفوتر، وتوثيق في `docs/BRAND.md`.
  - **اللودينق:** `app/loading.tsx` و`app/admin/loading.tsx` يظهران فورًا أثناء الانتقال: القلم يكتب سطرًا ثم تظهر نقطة عنبرية، بـCSS خالص (`offset-path`) ويحترم `prefers-reduced-motion`.
  - **التحقق:** `tsc` ولينت نظيفان؛ الشعار والأيقونة يظهران في المتصفح. **لم تُعاين الحركة بصريًا** (لوحة المتصفح مخفية والمتصفح بوضع تقليل الحركة)، وتحقّقت فقط من تحليل CSS. لم أطبّق الشعار بعد على صفحة الدخول ورسالة البريد.
- [x] **تطبيق الهوية على الدخول والبريد (2026-10-29):** العلامة `QalamMark` أعلى صفحة `/login`؛ وترويسة قالب البريد صارت بأخضر الهوية `#0b6b5e` مع الكلمة والخط العنبري. **حدّ:** لا علامة SVG في البريد لأن عملاء البريد لا تدعمه؛ تحتاج صورة PNG مستضافة (لم تُنشأ). لم يُعاين القالب في عميل بريد، ولا صفحة الدخول بصريًا.
- [x] **إصلاح لودينق «الصورة الجامدة» (2026-10-29):** السبب أن الحركة كانت CSS (`offset-path`) وتُعطَّل كليًا عند «تقليل الحركة» في النظام. أُعيد بناء `QalamLoader` بحركة SVG أصلية (SMIL: `animate` و`animateMotion`) لا تتأثر بالإعداد، مع مسار خافت يوحي بالسطر، وكتابة ثم نقطة ثم تلاشٍ بدورة 2.4ث. حُذف CSS القديم من `globals.css`. **التحقق:** في المتصفح تحرك السنّ فعلًا من اليمين لليسار ورُئيت لقطة الشاشة؛ لم يُراجع الشكل أثناء الحركة على الموقع المنشور.
- [x] **الوضع الفاتح/الداكن (2026-10-29):**
  - بحثتُ بـ`npx skills find` (dark mode): أقواها `owl-listener/designer-skills@dark-mode-design` (2.5K) و`theming-system` (2.2K) و`jezweb/claude-skills@tailwind-theme-builder` (3.2K). لم أثبّتها (تحتاج موافقة المالك بحسب CLAUDE.md)؛ نُفّذ بمهارتي `material-design` و`frontend-design`.
  - **التنفيذ:** أدوار M3 داكنة في `globals.css` (تحت `prefers-color-scheme` وتحت `data-theme="dark"`)؛ الأصل يتبع الجهاز. `components/theme-toggle.tsx` (فاتح / مثل الجهاز / داكن) في الهيدر، يحفظ الاختيار في `localStorage` بالمفتاح `qalam-theme`، وسكربت في `<head>` يطبّقه قبل الرسم لمنع الوميض. أُضيف `themeColor` للمتصفح. استُبدل الأبيض الثابت في ترويسة صفحة المسار وسنّ الشعار بالدور `on-primary`.
  - **التحقق:** `tsc` نظيف؛ في المتصفح تبدّلت السمة والخلفية بين الأوضاع الثلاثة بلا أخطاء في الـconsole. لم تُراجع كل الصفحات (admin، الدرس، الاختبارات) بصريًا في الوضع الداكن.
- [x] **الأساسيات بقرار المالك (2026-10-29): رفع فيديو + ملخص PDF + تعارف وخطة شخصية بالذكاء الاصطناعي** (بحثتُ بـ`npx skills find cloudinary`: أقواها `cloudinary-devs/skills@cloudinary-docs` بـ1K تثبيت؛ لم أثبّت شيئًا بانتظار موافقتك، ونُفّذ بالوثائق الرسمية).
  - **رفع الفيديو إلى Cloudinary (رابط نصي فقط):** المتصفح يرفع الملف **مباشرة** إلى Cloudinary بتوقيع من الخادم (`CloudinaryUploadSigner`، SHA-1، السر لا يغادر الخادم)، فلا حدّ لحجم الطلب في Vercel؛ نخزّن الرابط والمدة فقط. Domain: `Lesson.mediaUrl` و`parseCloudinaryVideoUrl` (يقبل `https://res.cloudinary.com/<cloud>/video/upload/...` فقط). Application: منفذ `MediaUploadSignerPort` وuse case `CreateUploadTicket` (للمدير فقط) و`LessonFields.mediaUrl/mediaDurationSeconds` (المدة تصير نهاية المقطع). Web: مكوّن `LessonVideoSource` (يوتيوب أو رفع بشريط تقدم، حدّ 100MB) و`LessonPlayer` (`<video>` بمقطع `#t=`) ومسار `/api/admin/upload-ticket`. الهجرة `004_lesson_media_and_study_guide.sql` (يلزم تشغيلها على Supabase). متغيرات: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` (في `.env.example`). مسودة الملاحظات بالذكاء الاصطناعي لا تعمل للفيديو المرفوع (Gemini يقرأ يوتيوب فقط) فتُكتب الملاحظات يدويًا.
  - **ملخص الدرس للقراءة وPDF (يُولَّد بزر المتعلم):** زر «لخّص لي الدرس بالذكاء الاصطناعي» في صفحة الدرس يولّد الملخص عند الطلب من ملاحظات الدرس فقط، ويُحفظ مرة واحدة (`SummarizeLessonUseCase`، لا يمسّ المراجعة البشرية)، ثم صفحة `/paths/.../summary` بشعار «قلم» في الأعلى والأسفل وزر «احفظ كـ PDF» (طباعة المتصفح: يحفظ الخط العربي سليمًا). المالك يعدّل نص الملخص من صفحة الدرس الإدارية. Domain: `study-guide.ts` (تحويل ذهابًا وإيابًا).
  - **التعارف والخطة الشخصية:** صفحة `/start`: الشغف + المجال بدقة + المستوى + الساعات. `StartOnboarding` يختار الذكاء الاصطناعي المسار الأنسب **من مسارات المنصة فقط** (يتحقق أن المعرّف حقيقي، وإلا يعود للكلمات المفتاحية)، ثم الاختبار التشخيصي (أسئلة معتمدة) ثم `BuildPersonalPlan`: توزيع حتمي للدروس المتبقية على أسابيع بحسب الساعات (`buildPlanWeeks` في Domain)، والنموذج يكتب عناوين الأسابيع وأسبابها فقط (يُتحقق منها). تُسجَّل كأحداث `goal_set` و`plan_created` (تاريخ كامل). صفحة `/plan` («خطتي»): الهدف والخطة الأسبوعية وحالة كل درس (أنجزته/تخطّيناه/التالي/قادم) وسجل ما درسه وزر «حدّث خطتي». تُحدَّث تلقائيًا بعد التشخيصي.
  - **التحقق:** 184 اختبارًا ناجحًا، `tsc` ولينت نظيفان. في المتصفح (خادم معزول ببيانات مؤقتة): رفع درس بفيديو Cloudinary (رابط تجريبي) ← مشغّل `<video>` بالمقطع الصحيح؛ تذكرة الرفع لا تكشف السر؛ التعارف ← خطة من 11 أسبوعًا بحالاتها.
  - **غير مُجرَّب:** الرفع الفعلي إلى Cloudinary (لا مفاتيح)، واستدعاء Gemini الحقيقي للتلخيص واختيار المسار وعناوين الأسابيع، وهجرة 004 على Supabase.
  - **المتبقي مما اتفقنا عليه:** «اسأل قلم» (مساعد يجيب عن الدرس من محتواه)، لوحة الأثر للمسابقة، التذكيرات بالبريد، واختبار تشخيصي بحسب المجال يُولَّد بالذكاء الاصطناعي لدروس لم تُعتمد أسئلتها بعد (الحالي يستعمل الأسئلة المعتمدة).
- [x] **«اسأل قلم» (2026-10-29):** صندوق أسئلة في صفحة الدرس (يظهر فقط إن كان للدرس ملخص أو ملاحظات أو ملخص قراءة). `AskLessonUseCase` يجيب **من مادة الدرس فقط** (ملخص + ملاحظات المالك + ملخص القراءة) بتعليمات تمنع الإضافة من الخارج وتتجاهل أي أوامر داخل السؤال؛ ردّ النموذج يُتحقق بمخطط `{answerable, answer}`، وإن لم تكفِ المادة تظهر الإجابة مع تنبيه «راجع الفيديو». حدّ السؤال 500 حرف، ويرفض بلا مفتاح ذكاء اصطناعي أو بلا مادة نصية. الملفات: `application/use-cases/ask-lesson.usecase(.test).ts`، `web/.../lessons/[lessonId]/ask-action.ts`، `components/ask-qalam.tsx`، وربط في `container.ts` (مهلة 25ث). **التحقق:** اختبارات use case ناجحة (3 جديدة)، `tsc` ولينت نظيفان. **غير مُجرَّب:** الواجهة في المتصفح ولا استدعاء Gemini حقيقي، ولا يُسجَّل حدث قياس لكل سؤال بعد.
- [x] **أول تجربة على Supabase وCloudinary وGemini الحقيقية (2026-10-29):**
  - **الدخول برمز البريد:** سُجّل دخول المدير فعليًا (`Qalam7p@gmail.com`) برمز وصل من «قلم»، وظهر رابط لوحة التحكم. المرسل المخصص يعمل، فلا حاجة لـBrevo.
  - **رفع Cloudinary الحقيقي ✓:** تذكرة موقّعة من الخادم ← رفع مقطع قصير مولَّد من المتصفح ← استجابة 200 بالرابط والمدة (2.17ث)، ثم أُنشئ درس به في Supabase وعرضته صفحة المتعلم بـ`<video src=…#t=0,3>` واسم المصدر. (درس الاختبار «درس تجريبي مرفوع (Cloudinary)» ما زال في مسارك الحقيقي وملف `qalam/lessons/…webm` في حسابك؛ احذفهما متى شئت.)
  - **Supabase ✓:** قراءة المسار والدروس (52 رابط درس)، كتابة الدرس الجديد، وتسجيل أحداث التعارف والخطة.
  - **Gemini الحقيقي:** الجودة جيدة (اختيار المسار وسببه، وعناوين أسابيع وأسبابها بعربية سليمة)، لكنه **بطيء**: اختيار المسار ≈19ث، وصياغة عناوين الخطة ≈63ث. كانت مهلة 25ث تُسقط الطلبين للقواعد وتجعل المتعلم ينتظر 55ث. **الإصلاح:** `BuildPersonalPlan` يقبل `withAi:false` فتُبنى الخطة فورًا بالقواعد، ثم تُصاغ العناوين بالذكاء الاصطناعي في الخلفية (`after` من Next، مهلة 100ث) وتحلّ محل الأولى؛ وصفحات التعارف والخطة والتشخيصي `maxDuration = 60`. اختيار المسار ما زال ينتظره المتعلم (مهلة 40ث). اختبار جديد؛ المجموع 188 ناجحًا.
  - **حدّ معروف:** على Vercel الخطة المجانية قد تقطع الخلفية قبل اكتمال Gemini (60ث)؛ عندها تبقى الخطة بالعناوين العامة وتُحدَّث بزر «حدّث خطتي».
  - **غير مُجرَّب بعد:** التلخيص و«اسأل قلم» بـGemini الحقيقي (يحتاجان ملاحظات للدرس)، وتفاعل صفحات الإدارة داخل لوحة المتصفح (لا تكتمل hydration والبانل مخفية؛ جُرّب عبر نماذج HTML الأصلية).
  - **تحسين لاحق:** بعد الإصلاح ظل اختيار المسار (≈40ث، ثم يسقط للقواعد) بطيئًا على Gemini المجاني، ولا معنى لسؤال النموذج والمنصة فيها مسار واحد؛ فأصبح `StartOnboarding` يختار المسار الوحيد فورًا ولا يستدعي النموذج إلا عند وجود أكثر من مسار (اختبار جديد، المجموع 189).
- [x] **لودينق لكل العمليات لا للتنقل فقط (2026-10-29):** `components/global-loader.tsx` (مركّب في `layout.tsx`) يرصد طلبات إجراءات الخادم (ترويسة `Next-Action`) فتظهر شاشة القلم عند تسجيل الدخول والخروج وتسليم الاختبارات والتلخيص وبناء الخطة وحفظ لوحة التحكم دون تعديل أي نموذج. لا تظهر قبل 150ms (لا وميض)، وإن ردّ الخادم بتوجيه (`x-action-redirect`) بقيت حتى يتغير العنوان (حد 8ث). التنقل بين الصفحات ما زال لـ`loading.tsx`. **التحقق:** `tsc` ولينت نظيفان؛ في المتصفح ظهرت الشاشة طوال طلب بطيء بترويسة الإجراء واختفت بعد انتهائه. **غير مُجرَّب:** تسجيل دخول وخروج فعليان بالشاشة (تكفي مراقبة الطلب)، وأثرها على الجوال.

- [x] **تسريع الذكاء الاصطناعي: Groq أولًا وGemini احتياطيًا (2026-10-29):** بطء Gemini المجاني (حتى 63ث) سببه تفكير نماذج Flash ومهلة 45ث لكل نموذج عند التعثر.
  - **جديد:** `OpenAiCompatibleLlmClient` (واجهة chat/completions؛ Groq افتراضيًا ويصلح لـCerebras بتغيير العنوان)، و`FallbackLlmClient` (سلسلة مزوّدين تنتقل عند 429/5xx/مهلة فقط، أما أخطاء المفتاح والحجب فتُرمى فورًا). `describeVideo` يذهب لأول مزوّد يدعمه (Gemini).
  - **Gemini:** `thinkingBudget: 0` في `generateJson`، وإن رفضه نموذج بـ400 يذكر thinking أُعيدت المحاولة عليه بدونه.
  - **الربط:** `apps/web/src/composition/llm.ts`: مع `GROQ_API_KEY` تصير السلسلة Groq ثم Gemini (إن وُجد مفتاحه)؛ `LLM_PROVIDER` ما زال يفرض مزوّدًا واحدًا (`groq|gemini|anthropic`). متغيرات جديدة: `GROQ_API_KEY`, `GROQ_MODEL` (الافتراضي llama-3.3-70b-versatile) في `.env.example`.
  - **الملفات:** `packages/infrastructure/src/llm/{openai-compatible-llm-client,fallback-llm-client}.ts` (+ اختبارات)، `gemini-llm-client.ts`، `index.ts`.
  - **غير مجرَّب:** استدعاء Groq الحقيقي (يلزم المفتاح) وقبول نماذج Gemini 3.x لـ`thinkingBudget: 0` فعليًا (المسار الاحتياطي يغطي رفضها). جودة العربية على Llama 3.3 تحتاج مراجعة عينات يدوية قبل اعتماد الأسئلة.

## تنزيل ملخص الدرس كـ PDF مباشرة (2026-10-29)
- استُبدل `window.print()` بتنزيل مباشر: `apps/web/src/components/print-button.tsx` يعرض نافذة تأكيد (موافق/إلغاء) ثم يلتقط `#summary-sheet` فقط (بلا هيدر الموقع وفوتره) بـ `html2canvas-pro` ويولّد PDF بـ `jspdf` موزّعًا على صفحات A4 بحسب الطول، ويقطع عند حدود الأقسام `data-pdf-block`. الملف دائمًا بالألوان الفاتحة.
- تبعيات جديدة في apps/web: `html2canvas-pro`, `jspdf`. غير مجرَّب في المتصفح بعد.
  - **تحديث (2026-10-31):** رفض 403 من Groq (حجب شبكة/منطقة، رسالته «Access denied. Please check your network settings») صار يُعامَل كعطل مؤقت فينتقل الطلب إلى Gemini بدل التوقف. وسجّل `FallbackLlmClient` سطر `[llm] <المزوّد> نجح/فشل ... ms` لكل محاولة في سجل الخادم، لمعرفة من يخدم «اسأل قلم» والتلخيص وكم يستغرق. ملاحظة: «اسأل قلم» والتلخيص يستعملان السلسلة نفسها، والتلخيص يُخزَّن بعد أول توليد فيبدو أسرع.

## إصلاح غياب شاشة التحميل عند فتح الدرس والتلخيص (2026-10-31)
- السبب: `loading.tsx` كان في جذر `app` و`admin` فقط، وReact لا يُظهر fallback حدٍّ ظاهر أصلًا أثناء الانتقال؛ فالانتقال إلى الدرس وإلى صفحة التلخيص (يُولَّد على الخادم أثناء العرض) كان يبدو معلّقًا. `GlobalLoader` يغطي إجراءات الخادم فقط لا التنقل.
- أُضيفت `loading.tsx` عند: `paths/[pathId]`، `lessons/[lessonId]`، `summary`، `quiz`، `diagnostic` برسائل خاصة بكل صفحة. فحص الأنواع ناجح؛ لم يُجرَّب في المتصفح بعد.
  - **OpenRouter ومهلة «اسأل قلم» (2026-10-31):** ظهور «انتهى الوقت» بعد دقيقة سببه أن صفحة الدرس بلا `maxDuration` (مهلة الدالة الافتراضية أقصر من سلسلة المزوّدين) ومهلة 40ث في `getPlanLlmClient`. الإصلاح: `maxDuration = 60` على صفحة الدرس، و«اسأل قلم» صار بوضع سريع (`getLlmClient({fast:true})`): Groq ثم `gemini-3.1-flash-lite` ثم `gemini-3.8-flash` (مهلة 15ث لكل نموذج) ثم OpenRouter، بمهلة إجمالية 50ث. أُضيف OpenRouter كحلقة أخيرة في السلسلة (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`، الافتراضي `openrouter/free` (موجّه مجاني يختار نموذجًا متاحًا لكل طلب؛ بلا Kimi)). المحوّل `OpenAiCompatibleLlmClient` يقبل مهلة قابلة للضبط. غير مجرَّب فعليًا على Vercel/OpenRouter.
  - **مؤشر انتظار داخل النموذج + ردّ مفتوح أطول (2026-10-31):** شاشة التحميل الكاملة كانت تمنع التصفح أثناء التلخيص و«اسأل قلم». أُضيف `components/inline-pending.tsx` (`InlinePending` + `PendingButton` بـ`useFormStatus`) فيظهر القلم تحت زر «لخّص لي الدرس» وتحت سؤال «اسأل قلم»، وعلّمنا النموذجين بـ`data-inline-loader` فيتجاوزهما `GlobalLoader` (يلتقط حدث submit ويتجاوز أول إجراء خلال 1.5ث). بقية العمليات على شاشة التحميل كما هي. وصار `maxDuration = 300` على صفحة الدرس ومهلة «اسأل قلم» الإجمالية 120ث (إن رفضت Vercel 300 على خطتكم فخفّضوها إلى 60). غير مجرَّب في المتصفح مع نموذج حقيقي.

## استيراد قائمة يوتيوب بالذكاء الاصطناعي من لوحة التحكم (2026-10-31)
- المالك يلصق رابط القائمة فقط داخل أي وحدة («استيراد قائمة يوتيوب بالذكاء الاصطناعي» في `/admin/paths/<id>`) ويختار مفهومًا افتراضيًا.
- **Domain:** `parseYouTubePlaylistId` (يقبل رابط القائمة أو فيديو داخل قائمة أو المعرّف، ويرفض غير يوتيوب).
- **Application:** منفذ `PlaylistCatalogPort` وuse case `ImportPlaylistUseCase` (للمدير فقط): يقرأ الفيديوهات، يتجاوز الموجود أصلًا في المسار والفيديو بلا مدة (فإعادة الاستيراد آمنة)، حتى 50 فيديو في الدفعة؛ يرسل العناوين والأوصاف المنشورة فقط للنموذج ليصحّح العنوان ويربط كل درس بمفهوم من مفاهيم المنصة ويحدد اللغة؛ الردّ يُتحقق بمخطط، والمعرّف المختلق يسقط للمفهوم الافتراضي، وفشل النموذج كليًا لا يوقف الاستيراد (عناوين يوتيوب + المفهوم الافتراضي).
- **Infrastructure:** `YouTubePlaylistCatalog` (YouTube Data API v3: playlistItems ثم videos للمدة والقناة، مع ترقيم الصفحات حتى 200). يتطلب `YOUTUBE_API_KEY` (في `.env.example`)؛ بدونه يُعطَّل الاستيراد فقط برسالة واضحة.
- **قواعد الجودة محفوظة:** كل درس مستورد `reviewedByHuman: false`، المقطع الفيديو كاملًا ويضيّقه المالك عند المراجعة، واسم القناة من يوتيوب، ولا نسخ للفيديو.
- **الملفات:** `domain/value-objects/youtube.ts`، `application/ports/playlist-catalog.port.ts`، `application/use-cases/admin/admin-playlist-import.usecases.ts`، `infrastructure/src/youtube/youtube-playlist-catalog.ts`، `web/composition/admin.ts`، `web/app/admin/actions.ts`، `web/app/admin/paths/[pathId]/page.tsx` (+ اختبارات).
- **التحقق:** 205 اختبارات ناجحة، `tsc` نظيف. **غير مجرَّب:** استدعاء YouTube API الحقيقي (يلزم المفتاح) وجودة تعيين المفاهيم بنموذج حقيقي، والنموذج في المتصفح. توليد الملاحظات (`ولّد مسودة الملاحظات`) يبقى زرًا منفصلًا لكل درس.
- **تحديث (2026-10-31): الاستيراد صار شاملًا على مستوى المسار.** حُذف النموذج الخاص بالوحدة، وفي صفحة المسار بطاقة «استيراد قائمة يوتيوب تلقائيًا» بحقل واحد (الرابط):
  - `ImportPlaylistUseCase` (مسار كامل): يقسّم القائمة إلى وحدات ودروس بالنموذج، ويحدد مفهوم كل درس: يعيد استعمال مفهوم موجود (بالمعرّف أو الاسم) أو ينشئ مفهومًا جديدًا بمستواه ومتطلباته السابقة (المجهول والدورات تُهمل)، ويكتب عنوانًا وملخصًا قصيرًا من وصف الفيديو. المدة والقناة والمصدر من يوتيوب لا من النموذج. الفيديو الذي لم يسنده النموذج يدخل وحدة «دروس إضافية». فشل النموذج يوقف الاستيراد برسالة ولا يحفظ شيئًا.
  - `EnrichPathUseCase`: يركّب use cases الموجودة (ملاحظات المصدر ← ملخص القراءة ← 4 مسودات أسئلة) لكل درس يوتيوب، متسلسلًا بميزانية 240ث، ويتوقف بعد 3 إخفاقات متتالية، ويكمل من حيث توقف (لا يكرر ما اكتمل). يعمل في الخلفية بعد الاستيراد (`after` من Next، و`maxDuration = 300` لصفحة المسار) وبزر «أكمل الملاحظات والملخصات والأسئلة».
  - **ما لا يُؤتمت عمدًا (قاعدة الجودة):** وسم «مراجعة بشرية» واعتماد الأسئلة يبقيان للمالك، وتضييق المقطع من الفيديو الكامل. الفيديو المرفوع (Cloudinary) لا يقرؤه النموذج فلا يدخل الإكمال.
  - **التحقق:** 213 اختبارًا ناجحًا، `tsc` ولينت نظيفان. **غير مجرَّب:** YouTube API وGemini الحقيقيان والواجهة في المتصفح؛ قراءة Gemini لفيديو طويل كامل قد تفشل أو تبطؤ (يظهر في الإخفاقات ويعاد بالزر). يلزم أن يكون Gemini مضبوطًا لأن Groq لا يقرأ الفيديو.

## الهيكل الجديد: مسار ← مفهوم ← كورس ← وحدة ← درس (2026-10-31)
بقرار المالك: لا مفاهيم عامة، والدرس لا يُنسب لمفهوم بمفرده. المسار يضم مفاهيم، والمفهوم يضم كورسات، والكورس وحدات، والوحدة دروسًا. قرارات المالك: تصفير البيانات الحالية وإعادة الاستيراد، واختيار المسار فقط عند الاستيراد (النموذج يحدد المفهوم)، والأسئلة بالدرس مع الإتقان بالكورس والمفهوم.
- **Domain:** كيان جديد `Course` (id، conceptId، عنوان، وصف، ترتيب، وحدات). `Concept` صار له `pathId` (يتبع مسارًا واحدًا). `Lesson` فقد `conceptId`. `LearningPath` يملك `courses`، و`modules` عرض مسطّح للقراءة، وفيه `findCourse/addCourse/replaceCourse/removeCourse/moveCourse` و`courseOfModule` و`conceptIdOfLesson` و`lessonConceptMap` و`conceptIds`. ترقيم الوحدات صار داخل الكورس. الخدمات: الاختبار التشخيصي يرتّب مفاهيم المسار بترتيب كورساته ويستعمل `lessonConceptMap`، والوكيل يختار «الدرس البديل» من **كورس آخر** على نفس المفهوم (وإلا يوصي بمراجعة الدرس).
- **Application:** `ConceptRepositoryPort.findByPath`. المفاهيم: الإنشاء بـ`pathId`، والمتطلبات السابقة من المسار نفسه فقط (مع منع الدورات)، ولا يُحذف مفهوم له كورسات أو هو متطلب. جديد: `AddCourse/UpdateCourse/DeleteCourse/MoveCourse` (الكورس يُنقل بين مفاهيم المسار الواحد فقط)، و`AddModule` يطلب `courseId`، و`DeletePath` يحذف مفاهيم المسار. حقول الدرس بلا `conceptId`. `ImportPlaylistUseCase` أُعيد: المدخل المسار والرابط فقط، والقائمة كلها كورس واحد: يحدد النموذج المفهوم (يعيد استعمال مفهوم المسار بالمعرّف أو الاسم، أو ينشئ جديدًا بمتطلباته من مفاهيم المسار)، ويقسّم الوحدات والدروس. `GetLearningPath` يعيد مفاهيم المسار. خريطة المفاهيم تعرض مسار كل مفهوم.
- **Infrastructure:** هجرة `005_concept_course_hierarchy.sql` (**مدمّرة**: تفرّغ المسارات والمفاهيم والدروس وأسئلتها وحالات الإتقان وتبقي المتعلمين والأحداث؛ جدول `courses`، و`concepts.path_id`، و`modules.course_id`، وحذف `lessons.concept_id`). `SupabasePathRepository` يقرأ `courses(modules(lessons))` ويحفظ ويحذف اليتامى بالترتيب (دروس ← وحدات ← كورسات)، ومستودعات المفاهيم تحمل `path_id`. اللقطة المحلية صارت `version: 2` (القديمة تُتجاهل فتبدأ البذرة). البذرة: 3 مفاهيم وكورس لكل مفهوم. سكربت `seed-supabase` يحفظ المسار فارغًا أولًا ثم المفاهيم ثم الكورسات (مفاتيح أجنبية).
- **الواجهة:** صفحة المسار الإدارية: مفاهيم المسار ← كورساتها (ترتيب، تعديل، نقل لمفهوم آخر، حذف) ← وحداتها ← دروسها، مع «كورس جديد» و«استيراد قائمة ككورس». `/admin/concepts?path=` لإدارة مفاهيم مسار (بلا مسار تعرض قائمة المسارات). نموذج الدرس بلا حقل المفهوم. صفحة المتعلم تعرض المفهوم ثم الكورس ثم الوحدات.
- **التحقق:** 44 ملف اختبار ناجحًا، `tsc` ولينت نظيفان. في المتصفح (خادم معزول بلا Supabase): صفحة المسار للمتعلم والإدارية وصفحات المفاهيم والدرس والمكتبة وخريطة المفاهيم تعرض بلا أخطاء. **غير مجرَّب:** الهجرة 005 على Supabase الحقيقي، والاستيراد الفعلي (يوتيوب وGemini)، وإجراءات الإدارة بالنقر (لا hydration والبانل مخفية).
- **مؤجَّل:** عرض تقدّم الإتقان لكل كورس ومفهوم في صفحة المتعلم (الإتقان يُحسب بالمفهوم من أسئلة دروسه)، وإبقاء `lessons.summary` من وصف يوتيوب فقط.

## ربط الهيكل الجديد بقاعدة Supabase الحقيقية وإصلاحاته (2026-10-31)
- **بعد تشغيل الهجرة 005:** جُرّب الاستيراد كاملًا على Supabase الحقيقية: قراءة/كتابة مسار ← مفهوم ← كورس ← وحدة ← درس ثم الحذف (نجح)، ثم استيراد قائمة «البداية من هنا» من يوتيوب فعليًا: مسار «أساسيات الحاسوب للمبرمج» ← مفهوم «أساسيات الحاسوب والبرمجة» ← كورس بـ3 وحدات و20 درسًا (المدة والقناة من يوتيوب). صفحات المتعلم (المسار والدرس والملخص والاختبار والتشخيصي والمكتبة وخريطة المفاهيم) تعمل عليها بلا أخطاء.
- **إصلاح ردّ النموذج:** Gemini أخطأ في إغلاق كائن `course` فأدخل `modules` داخله (JSON غير صالح). صار مخطط الاستيراد مسطّحًا (`courseTitle` و`courseDescription` في الأعلى)، مع مثال للشكل في التعليمات، وإعادة محاولة واحدة عند JSON/بنية تالفة فقط. وفي `GeminiLlmClient.generateJson` إعادة طلب واحدة عند JSON تالف (يشمل الملخصات والأسئلة). اختباران جديدان.
- **الإكمال التلقائي (ملاحظات/ملخص/أسئلة):** يعمل لكن مزوّد Gemini المجاني متقطع (503 وJSON مبتور)، وGroq يرفض (403) من الشبكة المحلية؛ اكتمل 3 ملاحظات وملخص واحد فقط، والباقي بزر «أكمل الملاحظات والملخصات والأسئلة».
- **سبب أخطاء السيرفر المحلي:** `next build` و`next dev` يتشاركان `apps/web/.next`؛ تشغيل أحدهما (أو بقاء خادم قديم) يُفسد الآخر فتظهر أخطاء مثل «Could not find the module … React Client Manifest» أو «Cannot find module './846.js'». الحل: إيقاف الخادم، حذف `apps/web/.next`، ثم `npm run dev`.

## 2026-10-31 — اعتماد دفعي وبطاقات الكورسات
- **اعتماد الدروس دفعة:** `ApproveLessonsUseCase` (كورس `courseId` أو وحدة `moduleId`) في `admin-lessons.usecases.ts`؛ زر «اعتماد كل دروس الكورس (n)» في ترويسة بطاقة الكورس، وزر «اعتماد دروس الوحدة (n)» في كل وحدة، ولا يظهران إلا عند وجود دروس غير معتمدة.
- **اعتماد كل أسئلة الدرس:** `ApproveLessonQuestionsUseCase` في `admin-quiz.usecases.ts`؛ زر «راجعتُ الأسئلة وأعتمدها كلها (n)» في صفحة الدرس الإدارية.
- **بطاقات الكورسات:** كل كورس في بطاقة مستقلة (ترويسة مفصولة) في لوحة التحكم، وفي صفحة المسار للمتعلم مع عدد الوحدات والدروس والمدة.
- الملفات: `admin-lessons.usecases.ts`، `admin-quiz.usecases.ts`، `admin-quiz.usecases.test.ts`، `composition/admin.ts`، `admin/actions.ts`، صفحات `admin/paths/[pathId]` و`lessons/[lessonId]` و`paths/[pathId]`. الاختبارات: 230 ناجحة، وفحص أنواع الواجهة نظيف. لم تُجرَّب الواجهة في المتصفح بعد.

## 2026-10-31 — صفحة مستقلة لكل كورس في لوحة التحكم
- صفحة المسار صارت تعرض كل كورس **بطاقة** تفتح `/admin/paths/[pathId]/courses/[courseId]` (وحدات الكورس ودروسه وتعديله).
- زر «أكمل الملاحظات والملخصات والأسئلة» انتقل من بطاقة الاستيراد إلى صفحة الكورس ويعمل على دروس **هذا الكورس فقط** (`EnrichPathUseCase` يقبل `courseId` اختياريًا).
- الإجراءات تعود لصفحة الكورس عبر حقل `returnTo` (يُقبل فقط إن كان داخل المسار نفسه، `backTo` في `actions.ts`)؛ رابط الرجوع من صفحة الدرس يرجع للكورس.
- الملفات: `components/admin-course.tsx` (جديد)، `admin/paths/[pathId]/courses/[courseId]/page.tsx` (جديد)، `admin/paths/[pathId]/page.tsx`، `lessons/[lessonId]/page.tsx`، `admin/actions.ts`، `admin-path-enrichment.usecases.ts` (+ اختبار). غير مجرَّب في المتصفح.

## 2026-10-31 — صفحة كورس للمتعلم
- صفحة المسار `/paths/[pathId]` تعرض الكورسات بطاقات (مع «أنجزت X من Y» للمسجَّل) تفتح `/paths/[pathId]/courses/[courseId]` (جديدة، مع `loading.tsx`) وفيها الوحدات والدروس والمصدر وشريط تقدم الكورس.
- الملفات: `apps/web/src/app/paths/[pathId]/page.tsx`، `courses/[courseId]/page.tsx` و`loading.tsx`. فحص الأنواع وESLint ناجحان؛ غير مجرَّب في المتصفح. رابط الرجوع في صفحة الدرس ما زال يشير للمسار.

## 2026-10-31 — استيراد القائمة كاملة بلا سقف 50
- أُزيل سقف 50 فيديو (`MAX_PLAYLIST_VIDEOS`) الذي كان يقطع القائمة بصمت؛ القائمة تُستورد كورسًا كاملًا دفعة واحدة. سقف قراءة يوتيوب صار 2000 (حد أمان فقط).
- حتى 50 فيديو: المسار السابق (عنوان وملخص ولغة لكل درس). فوق 50 (`DETAILED_DRAFT_MAX_VIDEOS`): استدعاء واحد للنموذج بالعناوين فقط يعيد وحدات بنطاقات أرقام (`firstIndex/lastIndex`)؛ تبقى عناوين الدروس من يوتيوب واللغة تُستنتج من الحروف، والنطاق المتداخل يُتجاهل وغير المغطى يدخل «دروس إضافية». الملفات: `admin-playlist-import.usecases.ts` (+ اختبار)، `youtube-playlist-catalog.ts`، نص صفحة المسار. الاختبارات: 230 ناجحة. غير مجرَّب مع يوتيوب/نموذج حقيقي.

## 2026-10-31 — إكمال إضافة دروس القائمة لكورس موجود
- في صفحة الكورس (لوحة التحكم) قسم «إكمال إضافة دروس القائمة»: يلصق المالك رابط القائمة نفسها فيضيف `ImportPlaylistUseCase` (مع `courseId`) الفيديوهات الناقصة فقط إلى هذا الكورس في وحدة «تكملة القائمة» (بلا نموذج ولا تكرار)، ثم تُولَّد ملاحظاتها وأسئلتها في الخلفية لهذا الكورس. الملفات: `admin-playlist-import.usecases.ts` (+ اختبار)، `admin/actions.ts`، صفحة الكورس الإدارية. الاختبارات: 231 ناجحة. غير مجرَّب مع يوتيوب حقيقي.

## 2026-10-31 — العمليات الطويلة في الخلفية دون تعطيل التصفح
- **المشكلة:** استيراد القائمة وإكمال الملاحظات/الملخصات/الأسئلة كانت تنتظر انتهاءها (دقائق) فيتعطل المالك، وكانت أيضًا تكتب نسخة قديمة من المسار فوق تعديلاته أثناء الاستدعاء البطيء.
- **الحل:** `importPlaylistAction` و`enrichPathAction` يسجّلان العملية ويعودان فورًا، والعمل يكمل بـ`after` (`runInBackground` في `admin/actions.ts`). تعديلات المالك (إضافة/تعديل/حذف مسار أو كورس...) لا تحتاج ذكاءً اصطناعيًا فتعمل بحرية أثناءها.
- **سجل العمليات:** منفذ `BackgroundJobPort` + use cases (`Start/Finish/ListBackgroundJobsUseCase`: منع تكرار نفس العملية، والعالقة بعد 8 دقائق تُعدّ فاشلة) + مستودعا ذاكرة وSupabase + هجرة `006_background_jobs.sql` (**يجب تشغيلها في Supabase**). مسار `/api/admin/jobs` وشريط `BackgroundJobs` في هيكل اللوحة يعرض الجاري والمنتهي، ويحدّث الصفحة عند الانتهاء.
- **منع الكتابة فوق التعديلات:** `DraftLessonNotesUseCase` و`GenerateStudyGuideUseCase` و`ImportPlaylistUseCase` تعيد قراءة المسار بعد استدعاء النموذج وقبل الحفظ (اختبار يغيّر عنوان المسار أثناء الاستدعاء).
- الاختبارات: 236 ناجحة. غير مجرَّب في المتصفح ولا مع Supabase/نموذج حقيقي.

## 2026-10-31 — تسريع الإضافة والتلخيص (حلول مجانية)
- **السبب الجذري 1 (كتابة قاعدة البيانات):** كل حفظ للمسار كان يرفع كل دروسه بنصوصها ثم يجري استعلامًا متتابعًا لكل وحدة وكورس لكشف المحذوف؛ والإكمال التلقائي يحفظ المسار كله مرتين لكل درس. **الحل:** `PathRepositoryPort.saveLesson?` (اختياري) + `persistLesson` في `admin-deps.ts`: توليد الملاحظات والملخص (للمالك وللمتعلم «لخّص لي») يكتب صف الدرس وحده. وكشف المحذوف في `removeOrphans` صار متوازيًا.
- **السبب 2 (قراءة الفيديو في Gemini المجاني):** الكلفة بالرموز لكل ثانية. صارت القراءة بلقطة كل ثانيتين (`fps: 0.5`) ودقة منخفضة (`MEDIA_RESOLUTION_LOW`) ≈ ربع الحجم، فيسرع الردّ وتتسع حصة الدقيقة؛ وإن رفض نموذج المعاملات (400) يُعاد الطلب بدونها (`withoutRejectedTuning`).
- **السبب 3 (التتابع):** الإكمال صار يعالج 3 دروس معًا (`ENRICH_CONCURRENCY`) بدل واحد (قد يتجاوز عدد الإخفاقات المتوقف عنده 3 بقدر الجاري وقتها).
- Groq (الأسرع) أولًا ثم Gemini ثم OpenRouter كانت قائمة أصلًا لـ«اسأل قلم» والتلخيص والاستيراد. الاختبارات: 238. **غير مقاسة بمفاتيح وقائمة حقيقية** (التحسن المتوقع تقدير لا قياس).

## 2026-10-31 — عناوين الدروس بالعربية
- **المشكلة:** عناوين الدروس المستوردة كانت تُنسخ من يوتيوب بلغة القناة (غالبًا إنجليزية) ولا تُترجم؛ وتعليمات النموذج كانت تطلب «بلغة الفيديو».
- **الحل:** `admin-title-translation.usecases.ts`: `translateTitles` (دفعات 40، تترجم ما فيه حروف لاتينية فقط، تُبقي المصطلحات التقنية، ترفض الردّ بلا عربية، وفشلها لا يوقف الاستيراد). يُطبَّق عند الاستيراد (القوائم القصيرة والطويلة وإكمال الكورس)، ويرى نموذج الهيكل العنوان المعرَّب والأصلي، وتُستنتج لغة الفيديو من الأصلي. وللكورسات المستوردة سابقًا: `TranslateLessonTitlesUseCase` وزر «ترجمة العناوين إلى العربية» في صفحة الكورس (عملية خلفية، يحفظ صف كل درس، ولا يمسّ اعتماد المراجعة).
- الاختبارات: 243 ناجحة. غير مجرَّب مع نموذج حقيقي.

## 2026-10-31 — إصلاح العمليات التي لا تنتهي، والمؤشر، والعدّاد
- **السبب (من قاعدة البيانات الحقيقية):** عملية الاستيراد بدأت 17:51 وبقيت «running» للأبد: الاستيراد + الترجمة + التوليد (ميزانية 240ث) تجاوزت 300ث فقتلتها المنصة قبل تسجيل النهاية. أما عملية التوليد المنفصلة فانتهت (265ث) وسُجّلت.
- **الإصلاح:** `JOB_LIMIT_MS=270s` في `runInBackground` (سباق `Promise.race` فتُسجَّل «انتهى الزمن، حُفظ ما اكتمل، أعد التشغيل» قبل القتل)؛ وميزانية التوليد صارت `270 − 110 هامش − ما استُهلك` (تُترك للزر إن لم يبقَ زمن)؛ والعالقة تُعدّ فاشلة بعد 6 دقائق (كانت 8) وتظهر 10 دقائق بعد ذلك.
- **المؤشر:** `JobLoader` داخل النماذج يُبقي مؤشر القلم تحت الزر ما دامت العملية جارية (يتسلّم من `InlinePending` لحظة عودة الإجراء)، وفي الشريط مؤشر صغير بجانب كل عملية جارية. الـAPI يعيد `key` لكل عملية.
- **العدّاد:** «131 درسًا بلا ملاحظات» كان عدد الدروس الناقصة لا كل الدروس (الكورس فيه 152)؛ صارت الرسالة «131 من أصل 152».
- الاختبارات: 243. غير مجرَّب في المتصفح.

## 2026-10-31 — حركة التمرير وتهدئة الواجهة
- **حركة التمرير:** `components/scroll-effects.tsx` (مركَّب في `layout.tsx`): (1) ظهور هادئ (12px، 500ms، تتابع بحد أقصى 4 × 70ms) للبطاقات والخطوات وصفوف الأقسام، (2) شريط تقدم عنبري رفيع أعلى الشاشة، (3) خط التمييز العنبري في `stroke-list` يُرسم مع ظهور الخطوة. لا يُخفي إلا ما هو تحت حدود الشاشة وقت الفحص (لا وميض)، وبدون JS يبقى كل شيء ظاهرًا، ويُعطَّل مع `prefers-reduced-motion` وفي `/admin`. لاستثناء عنصر: `data-no-reveal`، ولإضافة عنصر: `data-reveal-target`.
- **بلا ظلال:** رموز الارتفاع صارت `none`، وأُزيلت ظلال البطاقات والقائمة والنافذة؛ العمق بالحدود ولون السطح، والبطاقات القابلة للضغط تغيّر لون الحد عند المرور.
- **ألوان أهدأ مع الحفاظ على الهوية:** أسطح شبه محايدة بدل التدرج الأخضر، وحاويات primary/secondary/tertiary أخف؛ الأخضر المزرق + العنبري كما هما. الرئيسية: أُزيلت بطاقات الأرقام (صارت صفًا بفواصل)، وأُزيلت الترويسات الصغيرة، وأقسام المنصة صارت صفوفًا بخطوط رفيعة (`.row-link`).
- التحقق: tsc وeslint، وجُرِّب الظهور عند التمرير في المتصفح (الشريط يعتمد rAF فلم يُلحظ بصريًا في لوحة مخفية).

## 2026-10-31 — ترقية الواجهة وفق Material Design 3 (نظام تصميم موثّق)
- **القيد:** بلا أي مكتبة جديدة؛ كله Tailwind 4 + رموز `globals.css` + مكوّنات React القائمة.
- **التوثيق:** `docs/design-system.md` مرجع ملزم (الارتفاع النغمي، التباين، شبكة 4px، منحنيات الحركة، طبقات الحالة، تنظيم اللوحة، قائمة تحقق)، مكمّل لمهارة `material-design`.
- **الرموز:** `--ease-standard` و`--ease-emphasized-decel`، انتقالات 100–200ms، `text-caption` و`tabular`، لون تحديد النص، `card-interactive` (تغيّر النغمة لا الظل)، `data-table*` و`admin-nav*`.
- **المكوّنات:** `StatTile` بلا زخرفة (رقم tabular)، `PathCard` بـ`card-interactive`، شريط التقدم بحركة هادئة، `AdminPageHeader` و`AdminNav` (جديد).
- **اللوحة:** شريط جانبي ثابت ≥1024px وأفقي على الأصغر، عرض 7xl، صفحة المسارات بملخص أرقام وجدول بيانات (شريحة حالة بدل لون النص)، وصفحة المفاهيم بالجدول والترويسة الموحّدة.
- **التحقق:** `tsc --noEmit` للواجهة ناجح. لم تُجرَّب في المتصفح ولم يُشغَّل `next build` بعد.
- **تنبيه:** مدخلة السجل السابقة («حركة التمرير وتهدئة الواجهة») تصف `scroll-effects.tsx` و`.row-link` ورموز ارتفاع `none`، وهي غير موجودة في الشيفرة الحالية (تعديل غير محفوظ للسجل فقط). راجعها.

## 2026-10-31 — إعادة تصميم بصرية بأسلوب Apple (كل الصفحات عبر الرموز)
- **اللغة البصرية:** أسطح محايدة (أبيض/#f5f5f7، وأسود نقي في الداكن)، لون تمييز واحد أخضر مزرق، زوايا أكبر (16–32px)، فواصل شعرية، أزرار كبسولة بضغط مصغِّر، حقول رمادية ناعمة بحلقة تركيز، ترويسة زجاجية (`glass-bar`) بارتفاع 56px، طباعة كبيرة (`text-hero`/`text-display`) بلا letter-spacing (يكسر الحروف العربية). بلا ظلال ولا تدرجات.
- **التعميم:** الأسماء المستعارة القديمة (`ink`…) أُعيد ربطها بالأدوار فتغيّرت كل الصفحات تلقائيًا؛ `ink` صار لون النص لا الأخضر.
- **صفحات أُعيدت صياغتها:** الرئيسية (بطل مركزي، أرقام كبيرة، 4 خطوات، صفوف أقسام)، ترويسة الأقسام `PageHeader`، بطاقات المسار، ترويسة المسار والكورس (من كتلة داكنة إلى سطح هادئ)، مشغّل الفيديو، التذييل، عناوين الدروس والاختبارات.
- **التحقق:** `tsc` ناجح وتجميع Next ناجح، لكن `next build` توقف بخطأ `/_not-found` عند التشغيل بالتزامن مع خادم تطوير آخر على المجلد نفسه (يُعاد بدونه). عُيّنت الرئيسية في المتصفح (داكن وفاتح)؛ لم تُفحص بقية الصفحات ولا لوحة التحكم بصريًا.

## 2026-10-31 — المرحلة 1 من تحديث الهوية: الرموز والخطوط والعلامة والترويسة
- **النطاق:** بصري فقط؛ بلا تغيير في المنطق أو البيانات أو المسارات. تدقيق سابق (للقراءة فقط) أوصى بالخطوة.
- **الألوان (`globals.css`):** كحلي `#142B4A` (primary)، تيل `#20B6A5` (دور جديد secondary للتقدم والحالة النشطة، و`secondary-strong` #0B7A6E للنص)، بنفسجي `#8B7CF6` (أدوار `violet*` جديدة، لم تُطبَّق على المكوّنات بعد: مخصصة لميزات الذكاء الاصطناعي)، ذهبي `#C8A96A` (`highlighter`)، خلفية `#F5F7FA` وسطح `#FFFFFF`. الأسماء المستعارة القديمة أُعيد ربطها فتغيّرت كل الصفحات تلقائيًا.
- **التباين:** التيل والذهبي والبنفسجي الأصلية لا تصلح لنص صغير (≈2.5 و2.2 و3.4 إلى 1)، فللنص أدوار أغمق (`secondary-strong`، `tertiary` #7A5F1E، `violet-strong`). النص الثانوي `#5A6A7F` بدل `#64748B` لأن الأخير ≈4.4:1 على الخلفية (دون AA).
- **الخطوط (`layout.tsx`):** IBM Plex Sans Arabic للعناوين (400–700)، وTajawal للنص (400/500/700، بلا 600)، وInter للاتينية والأرقام. حُذف Mada. أُنزل وزن العرض الكبير 800 إلى 700 لأن Plex عند 700 حدًّا أقصى.
- **الوضع الداكن:** قيم جديدة مشتقة من الكحلي، وهي ليست من وثيقة الهوية وتنتظر مراجعة المالك.
- **العلامة:** الشكل لم يُمسّ. لوّنها يتبع الرموز فصارت كحلية بخط ذهبي؛ و`icon.svg` حُدّثت قيمه الحرفية. للتراجع: أعد `#0b6b5e` و`#f2b632` في `icon.svg` وارجع إلى القيمتين القديمتين لـ primary وhighlighter.
- **الخط الزمني `.stroke-list`:** من ذهبي إلى تيل كي يبقى الذهبي نادرًا. حلقة التركيز صارت `secondary-strong` (الذهبي لا يبلغ 3:1).
- **الترويسة:** أُزيل `backdrop-blur`، وأيقونة القائمة SVG بدل الرمز ☰، وفجوات أصغر على الجوال: كانت الصفحة تتجاوز العرض 10px عند 375px (scrollWidth 385) وصارت 375.
- **التحقق:** `tsc --build` ناجح، 245 اختبارًا ناجحًا، و`next build` ناجح (يلزم `NODE_OPTIONS=--max-old-space-size=4096` هنا). عُرضت الرئيسية و`/paths` عند 375px فاتحًا وداكنًا، ولا تجاوز أفقيًا، والخطوط تُحمَّل. لم تُراجَع بقية الصفحات بصريًا.
- **تنبيه:** مدخلتان سابقتان في هذا السجل («حركة التمرير…» و«أسلوب Apple») تصفان أسطحًا محايدة وظلالًا `none` غير موجودة في `globals.css` الذي بدأتُ منه (ظلال M3 قائمة). راجعهما.

## 2026-11-01 — المرحلة 2 من تحديث الهوية: المكوّنات المشتركة
- **النطاق:** بصري فقط في `components/ui.tsx` و`globals.css`؛ بلا تغيير في المنطق أو البيانات.
- **الشرائح:** `chip-warn` صار محايدًا بحدّ (كان ذهبيًا) لأن الذهبي للإتقان فقط؛ وأُضيفت `chip-progress` (تيل) و`chip-mastery` (ذهبي) و`chip-ai` (بنفسجي). لم تُطبَّق الثلاث الجديدة على الصفحات بعد إلا في `PathCard`.
- **`ProgressBar`:** التعبئة تيل (`secondary`) بدل الكحلي.
- **`PageHeader`:** لون العنوان العلوي (eyebrow) تيل `secondary-strong`.
- **`PathCard`:** وصف من سطرين بدل ثلاثة، فاصل خفيف فوق البيانات، وتحويل `<dd>` اليتيمة إلى `<dl>` سليمة بـ`<dt>` مخفي بصريًا، ورقم النسبة `tabular`، وشريحة «✓ مكتمل» ذهبية عند 100% فقط (من بيانات حقيقية).
- **`StatTile` و`EmptyState`:** بلا تغيير؛ تأخذان الألوان من الرموز.
- **التحقق:** `tsc` ناجح، 245 اختبارًا، و`next build` ناجح. عُرضت `/paths` عند 1100px و375px فاتحًا بلا تجاوز أفقي. لم تُعرض حالات التقدّم (تحتاج دخولًا) ولا الوضع الداكن لهذه المرحلة.
- **متبقٍ:** استبدال استخدامات `chip-warn` في الصفحات بالدور الأنسب (قرارات الوكيل ← `chip-ai`، الإكمال ← `chip-mastery`) ضمن مراحل الصفحات.

## 2026-11-01 — المرحلة 3 من تحديث الهوية: الصفحة الرئيسية
- **النطاق:** `app/page.tsx` فقط؛ بلا تغيير في المنطق أو الاستعلامات.
- **البطل:** العنوان والأزرار كما هي، والعمود الجانبي صار معاينة حقيقية: بطاقة أول مسار منشور (`PathCard`) بدل قائمة الخطوات. إن لم توجد مسارات تعود قائمة الخطوات إلى البطل.
- **«كيف يعمل قلم»:** الخطوات الأربع انتقلت إلى قسم مستقل بعنوان بعد شريط الأرقام (وعناوينها `h3` تحت `h2`).
- **الأرقام:** «إجمالي مدة المشاهدة» صارت «مدة المحتوى كاملًا» مع تلميح «مجموع مقاطع الدروس» لإزالة الغموض.
- **الثقة (جديد):** ثلاث بطاقات: المصدر ظاهر دائمًا، مراجعة بشرية موسومة (تشير إلى وسم المكتبة لا إلى ادّعاء أن كل الدروس رُوجعت، فكلها `reviewedByHuman: false` الآن)، قرارات الخطة معلَّلة، مع رابط `/about#sources`.
- **أقسام المنصة:** «التمارين العملية» تحمل شريحة «قيد البناء» بدل ذكرها في النص.
- **اللون:** العناوين العلوية (eyebrow) تيل `secondary-strong`.
- **التحقق:** `tsc` و245 اختبارًا و`next build` ناجحة. عُرضت الرئيسية فاتحة عند 1100px وداكنة عند 375px بلا تجاوز أفقي. لم تُعرض أسفل الصفحة عند 375px.
- **ملاحظة:** بطاقة المعاينة تكرّر أول مسار الظاهر أيضًا في قسم «المسارات المتاحة».

## 2026-11-01 — المرحلة 4 من تحديث الهوية: صفحات مسار التعلّم
- **النطاق:** تنسيق فقط في ست صفحات تحت `app/paths/[pathId]` (المسار، الكورس، الدرس، الاختبار القصير، التشخيصي، الملخص)؛ بلا تغيير في المنطق أو النماذج أو الإجراءات.
- **الأسماء القديمة:** استُبدلت بالأدوار (`ink`←`on-surface`، `muted`←`on-surface-variant`، `rule`←`outline-variant`، `paper`/`sheet`←أسطح الحاويات، `sea`←`primary`، `sea-dark`←`secondary-strong`) و`red-700`←`error`. لم يبقَ أي منها في هذه الصفحات.
- **الألوان بدور:** لوحة «لماذا اقترحنا هذا؟» بخط بنفسجي جانبي وشريحة `chip-ai`؛ «✓ مكتمل» و«أكملت هذا الدرس» بـ`chip-progress` (تيل)؛ «تم تخطيه (أتقنتَ مفهومه)» بـ`chip-mastery` (ذهبي) لأنه إتقان فعلي.
- **الإجراء الرئيسي:** زر «تسليم الإجابات» صار `btn-tonal` ليبقى «أكملت الدرس» الإجراء الأبرز الوحيد في صفحة الدرس.
- **العرض:** صفحات الدرس والتشخيصي والاختبار تأخذ `md:px-8` كبقية الصفحات.
- **التحقق:** `tsc` و245 اختبارًا و`next build` ناجحة. عُرضت صفحتا المسار والكورس عند 375px فاتحتين بلا تجاوز أفقي. صفحات الدرس والاختبار والتشخيصي والملخص تتطلب دخولًا فلم تُعرض في المتصفح، وكذلك الوضع الداكن.
- **متبقٍ:** مكوّنات الدرس (`ask-qalam`، `lesson-player`، `youtube-player`، `lesson-video-source`، `print-button`) فيها أسماء قديمة وتنتظر مرحلة لاحقة.

## 2026-11-01 — المرحلة 5 من تحديث الهوية: صفحات المتعلم ومكوّنات الدرس
- **النطاق:** تنسيق فقط؛ بلا تغيير في المنطق. الصفحات: `dashboard`، `plan`، `review`، `profile`، `start`. المكوّنات: `ask-qalam`، `lesson-player`، `youtube-player`، `lesson-video-source`، `print-button`، `resend-code-button`.
- **الأسماء القديمة:** استُبدلت بالأدوار (`ink`، `muted`، `sea`، `sea-dark`، `sheet`، `rule`، `paper`) في هذه الملفات.
- **الأدوار:** شرائح قرار الوكيل في `dashboard` و`review` صارت `chip-ai` (بنفسجي)؛ «آخر نتيجة %» في `review` صارت شريحة محايدة (كانت `chip-warn`)؛ و«اسأل قلم» بخط بنفسجي جانبي لأنه ميزة ذكاء اصطناعي.
- **متبقٍ بأسماء قديمة:** صفحات الإدارة (`admin/*`، `admin-course`، `background-jobs`، `lesson-fields`) وصفحة `login`، وسيُعالجها تحديث الإدارة والدخول. نافذة `print-button` لا تزال بـ`shadow-xl` (عنصر عائم).
- **التحقق:** `tsc` و245 اختبارًا و`next build` ناجحة؛ الصفحات الخمس تردّ 200 على خادم الإنتاج. **لم تُعرض بصريًا** (تحتاج دخولًا) لا فاتحة ولا داكنة.

## 2026-11-01 — المرحلة 6 من تحديث الهوية: الإدارة والدخول
- **النطاق:** تنسيق فقط؛ بلا تغيير في المنطق. الملفات: كل `app/admin/**`، و`login`، و`admin-course`، و`background-jobs`، و`lesson-fields`، وفئة وزن واحدة في الرئيسية.
- **الأسماء القديمة:** استُبدلت بالأدوار، و`red-700`←`error`، و`border-sea`←`primary`، و`font-extrabold`←`font-bold` (الخطوط الجديدة أقصى وزن لها 700 فلا فرق في الرسم)، وحُذف `shadow-sm` من بطاقات الإدارة (العمق بالحدّ)، و`hover:border-ink`←`hover:border-outline`.
- **الشرائح:** «مسودة» للأسئلة صارت `chip chip-warn` بدل خلفية ذهبية يدوية؛ وشرائح المتطلبات السابقة في `concepts` صارت `chip` عادية (ليست تحذيرًا). «بانتظار المراجعة» في المكتبة بقيت `chip-warn` المحايدة.
- **لا أسماء قديمة:** بحث `ink|muted|sea|rule|paper|sheet|red-700|highlighter|shadow-sm` في `app` و`components` لا يعيد شيئًا. ما بقي: `shadow-xl` في نافذة `print-button` (عنصر عائم).
- **التحقق:** `tsc` و245 اختبارًا و`next build` ناجحة. عُرضت `login` و`library` و`concepts` و`about` عند 375px فاتحة بلا تجاوز أفقي، و`login` بصريًا. صفحات الإدارة تحتاج صلاحية مسؤول فلم تُعرض، وكذلك الوضع الداكن.

## 2026-11-01 — التحقق النهائي لتحديث الهوية
- **التباين (محسوب من القيم):** كل أزواج النص في الفاتح ≥ 4.64:1 (أدناه `on-surface-variant` على `surface-container` 4.65، و`secondary-strong` على `surface-container-low` 4.64)، وفي الداكن ≥ 7.5:1. حدّ الحقول `outline` على الأبيض 3.65:1. ألوان الهوية الأصلية كتعبئة فقط: تيل 2.53 وذهبي 2.25 وبنفسجي 3.33 على الأبيض (لذلك لا تُستخدم للنص الصغير).
- **إصلاح:** تعبئة `ProgressBar` كانت تيل `secondary` على مسار بتباين 1.89:1 (دون 3:1 للمكوّنات)، فصارت `secondary-strong`.
- **الفحوص:** `tsc --build` و`eslint .` و245 اختبارًا و`next build` ناجحة.
- **المتصفح:** الرئيسية و`/practice` في الداكن عند 1100px متسقة، وحلقة التركيز بلوحة المفاتيح ظاهرة (3px، `secondary-strong`) على الروابط والأزرار في `/paths`.
- **لم يُفحص:** الصفحات التي تتطلب دخولًا أو صلاحية مسؤول (الدرس، الاختبار، التشخيصي، الملخص، خطتي، تعلّمي، المراجعة، الحساب، الإدارة)، ولا الداكن للصفحات الداخلية، ولا قارئ الشاشة، ولا الطباعة/PDF بالألوان الجديدة.

## إضافة فيديوهات مستقلة وكارد استيراد موحّد (2026-11-01)
- **المشكلة:** رفع الفيديو من الجهاز كان داخل «إضافة درس» في وحدة، فلا يظهر في مسار جديد (لا كورس ولا وحدة بعد)؛ ولا طريقة لإضافة فيديوهات بلا قائمة يوتيوب.
- كارد واحد `apps/web/src/components/import-source-card.tsx` في صفحة المسار بتبويبين: «قائمة يوتيوب» (رابط واحد، كما كان) و«فيديوهات مستقلة»: صفوف بترتيب الإضافة، كل صف رابط يوتيوب أو رفع من الجهاز، ويُستورد الكل بضغطة واحدة ككورس واحد (عنوان الكورس + مفهوم موجود أو جديد باسم الكورس).
- `ImportVideosUseCase` (`admin-videos-import.usecases.ts`) + port جديد `VideoMetadataPort.getVideos` ينفّذه `YouTubePlaylistCatalog` (يتطلب `YOUTUBE_API_KEY`). الدروس في وحدة «الدروس» بالترتيب المُدخل، تتجاوز المكرر، عناوين يوتيوب تُترجم، كلها «بانتظار المراجعة». `importVideosAction` يعمل في الخلفية بنفس مفتاح عملية الاستيراد.
- `components/cloudinary-upload.ts`: منطق الرفع المشترك (استُخرج من `lesson-video-source.tsx`).
- اختبارات: `admin-videos-import.usecases.test.ts`؛ المجموع 248 ناجحة. لم يُجرَّب في المتصفح ولا مع Cloudinary/يوتيوب حقيقيين.

## الخط الأساسي KOMission (2026-11-01)
- بأمر المالك صار **KOMission-Black** الخط الأساسي لكل الواجهة: الملف في `apps/web/src/fonts/KOMission-Black.otf` ويُحمَّل عبر `next/font/local` في `app/layout.tsx` (متغير `--font-komission`، مدى أوزان `100 900` لأنه وزن واحد فلا يُزيَّف العريض).
- `--font-sans` و`--font-display` في `globals.css` يبدآن به، وInter وTajawal وIBM Plex Sans Arabic احتياط للحروف التي لا يغطيها.
- ملاحظة: الخط وزن Black ثقيل، فالنصوص الطويلة ستبدو أغمق؛ وترخيصه لم يُتحقق منه، فراجعه قبل النشر.

## الخطوة 1 من تحسين الثراء البصري: توثيق «الورقة والحبر» (2026-11-01)
- **النطاق:** توثيق فقط، بلا تغيير في الكود. الملفات: `docs/design-system.md` (قسم جديد 10، وترقيم قائمة التحقق صار 11، وتصحيح سطر الخطوط إلى KOMission) و`docs/BRAND.md` (قسم «الورقة والحبر»).
- **القرارات المسجّلة (بتوجيه المالك):** لا بطاقات داخل أي هيرو؛ مصغّرات يوتيوب الأصلية للدروس مقبولة مع إظهار اسم القناة؛ هوية موحّدة بزخرف مستقل عن الموضوع؛ تجنّب مظهر «المولَّد آليًا».
- **قرار تصميمي مني يستحق المراجعة:** ألوان الأغلفة أربعة أدوار فقط (`primary`، `primary-container`، `secondary-strong`، `secondary-container`)، لأن الذهبي محجوز للإتقان والبنفسجي للذكاء الاصطناعي حسب القواعد القائمة. (ذكرت للمالك سابقًا «ألوان الهوية الأربعة» وهذا تصحيح لذلك.)
- **التالي (الخطوة 2):** مكوّن `CoverArt` + نقش الورقة + ضربة الحبر في `globals.css`، وإعادة بناء الهيرو بلا بطاقات، ثم تطبيقها على `PathCard` ورؤوس الصفحات. لم يُنفَّذ بعد.

## الخطوة 2 من تحسين الثراء البصري: الأغلفة والورقة والحبر (2026-11-01)
- **الملفات:** جديد `apps/web/src/components/cover-art.tsx` (`CoverArt` بنسبة 16:9 للبطاقات، `CoverBanner` لترويسات المسار والكورس، و`coverTone`/`coverLetter`). معدّلة: `globals.css` (فئتا `.paper` و`.cover-0..3`)، `components/ui.tsx` (غلاف في `PathCard`، نقش الورقة في `PageHeader`، و`InkStroke`)، `app/page.tsx`، `app/paths/[pathId]/page.tsx`، `app/paths/[pathId]/courses/[courseId]/page.tsx`.
- **الهيرو الرئيسي:** طباعي بلا بطاقات على نقش الورقة، مع ضربة حبر تحت «وأثبت أنك فهمته.» وحرف «ق» كبير خافت. الأرقام صارت صفًا بلا بطاقات تحت الهيرو، وقسم «الثقة» صار أعمدة بخط علوي بدل بطاقات.
- **الأغلفة:** اللون من تجزئة معرّف المسار (ثابت)، والكورس يرث لون مساره. أربع نغمات كحلية/تيلية فقط. الحرف الأول بعد تجاوز «ال». لا طلب شبكة.
- **صفحتا المسار والكورس:** الترويسة غلاف عريض، ونُقلت أشرطة التقدم والأزرار إلى شريط تحتها (لأن زر `btn-filled` بلون الغلاف نفسه كان سيختفي). بطاقة الكورس في صفحة المسار فيها غلاف مصغّر جهة البداية على الشاشات ≥ 640px.
- **تصحيح للقواعد:** `.paper` يستعمل `radial-gradient` تقنيًا لرسم النقاط بلون واحد، وهذا ليس تدرجًا لونيًا؛ ما زال التدرج اللوني ممنوعًا.
- **التحقق:** `tsc` و`eslint` و248 اختبارًا و`next build` ناجحة. عُرضت الرئيسية و`/paths` وصفحة مسار في المتصفح (فاتح وداكن) عند 1280px. **لم يُفحص:** الجوال 375px، صفحة الكورس بصريًا، والصفحات التي تتطلب دخولًا (حالة التقدم).
- **ملاحظة:** `next build` يفشل (`no direct app page entry found for /_not-found`) إذا كان خادم التطوير يعمل على المجلد `.next` نفسه؛ أوقفه قبل البناء.
- **متبقٍ:** مصغّرات الدروس (الخطوة 3)، حلقات التقدم وخريطة المفاهيم والحالات الفارغة (الخطوة 4)، وقسم «أقسام المنصة» ما زال بطاقات متشابهة.

## صور أغلفة المسارات والكورسات (2026-11-01)
- **القرار (المالك):** يرفع المدير صورة تكون خلفية بطاقة/ترويسة المسار أو الكورس، وإن لم توجد يظهر غلاف الحرف. (سبق أن أجّلتُ الرفع لمرحلة لاحقة وقدّمتُه الآن بطلبه.)
- **Domain:** حقل `coverUrl` اختياري على `LearningPath` و`Course` (يُحفظ في `updateDetails` و`withOrderIndex`)، والتحقق في `normalizeCoverUrl` (`cloudinary-media.ts`): https وres.cloudinary.com وimage/upload فقط. في التعديل: غائب = بلا تغيير، فارغ = إزالة.
- **Application:** `UpdatePath/UpdateCourse/CreatePath/AddCourse` تمرّر `coverUrl`؛ `LearningPathSummary.coverUrl`؛ المنفذ `MediaUploadSignerPort.sign(kind)` و`CreateUploadTicketUseCase` يقبلان `image`.
- **Infrastructure:** `CloudinaryUploadSigner.sign('image')` يوقّع إلى `image/upload` في `qalam/covers`؛ `SupabasePathRepository` يقرأ ويكتب `cover_url`؛ اللقطة المحلية تحفظه؛ هجرة جديدة `007_cover_images.sql` (عمودان نصيان).
- **الواجهة:** `api/admin/upload-ticket?kind=image`، و`uploadImage` في `cloudinary-upload.ts`، ومكوّن `cover-field.tsx` (معاينة + رفع + إزالة) في نموذج المسار ونموذج تعديل الكورس بلوحة التحكم. `CoverArt` و`CoverBanner` يقبلان `imageUrl` (img بتحويل Cloudinary، وطبقة `--color-scrim` داكنة في الترويسة). `PathCard` وبطاقة الكورس وترويستا المسار والكورس تمرّر الصورة.
- **الاختبارات:** 266 ناجحة (جديدة: التحقق من الرابط، الاحتفاظ بالغلاف/إزالته في الكيانات وحالات الاستخدام، توقيع الصور، تحويل صفوف Supabase، ودوال `cover-art` وعرض المكوّن بصورة وبدونها). أُضيف `esbuild.jsx = 'automatic'` إلى `vitest.config.ts` لعرض مكوّنات `.tsx`.
- **التحقق:** `tsc` و`eslint` و`next build` ناجحة. عُرضت `/paths` على بيانات Supabase الحقيقية فبقي غلاف الحرف سليمًا (لا صور). **لم يُجرَّب:** الرفع الفعلي إلى Cloudinary، ولا شاشات لوحة التحكم (تحتاج دخول مدير)، ولا عرض صورة حقيقية في المتصفح.
- **مطلوب منك قبل الاستعمال:** تشغيل `007_cover_images.sql` في Supabase؛ قبلها يفشل حفظ أي مسار أو كورس لأن الكود يكتب `cover_url`.
- **تنبيه:** وجدتُ في صفحتي المسار والكورس أسطرًا (`videoId={firstYouTubeId(...)}`) لم أكتبها، تجعل الغلاف مصغّرة أول فيديو ولا دعم لها في `cover-art`. استبدلتُها بـ`coverUrl` وفق قاعدة المالك (صورة مرفوعة أو حرف).

## الخطوة 3: مصغّرات الدروس من يوتيوب (2026-11-01)
- **القرار (المالك):** المصغّرة الرسمية من يوتيوب مقبولة لغلاف الدرس، مع بقاء اسم القناة ظاهرًا. تُجلب من `i.ytimg.com` مباشرة ولا تُنسخ ولا تُستضاف.
- **Domain:** `Lesson.youtubeVideoId` (معرّف من 11 حرفًا، وغائب للدرس المرفوع إلى Cloudinary حتى لو شبه معرّفُه معرّف يوتيوب).
- **Application:** `LibraryLesson.youtubeVideoId` في مكتبة الدروس.
- **الواجهة:** في `cover-art.tsx` الدالة `youtubeThumbnailSrc` (`mqdefault` 320×180 للقوائم، و`hqdefault` محجوزة للصفحة المفردة) والمكوّن `LessonThumb` (صورة كسولة بأبعاد محجوزة ونص بديل فارغ لأن العنوان مجاور، وغلاف مولَّد بلون المسار للدرس المرفوع). طُبِّق على: صفحة الكورس (مصغّرة 8rem بجانب كل درس، مخفية دون 640px)، ومكتبة الدروس (صورة بجانب كل بطاقة).
- **الاختبارات:** 272 ناجحة (جديدة: `lesson.test.ts`، وحالة المكتبة، و`LessonThumb`). `tsc` و`eslint` نظيفان.
- **التحقق في المتصفح:** عُرضت مكتبة الدروس وصفحة كورس على بياناتك الحقيقية فظهرت المصغّرات الفعلية. **لم يُفحص:** الجوال 375px، والوضع الداكن للمصغّرات، وصفحة الدرس نفسها (لم تُغيَّر: المشغّل هو البطل).
- **ملاحظات:** مكتبة الدروس تعرض كل الدروس (289) في صفحة واحدة؛ الصور كسولة فلا تُحمَّل إلا عند الاقتراب، لكن ترقيم الصفحات يستحق نظرة لاحقة. ومنفذ 3112 كان مشغولًا بعملية أخرى وتعارض مجلد `.next` معها مرتين (سبّب 404 مؤقتًا)؛ وطلبات Supabase انتهت مهلتها أحيانًا. أوقف أي خادم تطوير آخر على المشروع قبل الفحص أو البناء.

## الخطوة 4: حلقات التقدم والحالات الفارغة وأقسام بلا بطاقات (2026-11-01)
- **`ProgressRing`** (في `components/ui.tsx`): حلقة تقدم SVG بدور `progressbar`، تعبئتها تيل وتصير ذهبية عند 100% (الذهبي للإنجاز)، وتُقيَّد النسبة بين 0 و100. استُبدل بها شريط التقدم في ترويسة المسار وتحت ترويسة الكورس، وفي قسم «تابع من حيث توقفت» بلوحة «تعلّمي». شرائح قوائم المسارات بقيت بأشرطة. وحُذف إيموجي 🎉 من «أكملت هذا المسار» ليصير شريحة ذهبية `chip-mastery`.
- **`EmptyState`:** صار ورقة منقّطة بحد عادي ورسم صغير (ورقة بخطوط وضربة حبر) بدل الصندوق المنقّط؛ الواجهة نفسها فتتحسّن كل الصفحات التي تستعمله.
- **الرئيسية:** قسم «أقسام المنصة» صفوف في عمودين بخط علوي وسهم، بلا بطاقات. (قسما «الثقة» والأرقام تحوّلا من قبل.)
- **خريطة المفاهيم:** كتل المفاهيم بخط تيل جانبي بدل بطاقات متطابقة. لم أرسم رسمًا بيانيًا بعقد وخطوط (يحتاج بيانات المتطلبات كشبكة وخوارزمية تخطيط)، وبقي ذلك خارج هذه الخطوة.
- **الاختبارات:** 275 ناجحة (جديد `ui.test.ts`). `tsc` و`eslint` و`next build` ناجحة (البناء اكتمل هذه المرة؛ ما علق في الخطوة 3 كان بيئيًا).
- **التحقق في المتصفح:** الحالة الفارغة (`/paths?q=zzzzzz`) بصريًا، والرئيسية (6 صفوف بلا بطاقات في عمودين) وخريطة المفاهيم (4 كتل، 0 بطاقات) عبر DOM. **لم يُفحص:** الحلقات في صفحات تحتاج دخولًا (المسار بالتقدم، الكورس، «تعلّمي»)؛ غُطّيت باختبار عرض فقط. ولا الجوال ولا الداكن.

## الخطوة 5: غلاف الكورس من أول درس وصور الدروس في لوحة التحكم (2026-11-01)
- **القرار (المالك):** كل درس بصورته من يوتيوب، والكورس يأخذ صورة أول درس فيه.
- **`courseCoverUrl(course, size)`** في `cover-art.tsx`: يرجع الصورة المرفوعة يدويًا إن وُجدت (تتقدم)، وإلا مصغّرة أول درس له `youtubeVideoId` (`mqdefault` للبطاقات و`hqdefault` للترويسة)، وإلا undefined فيظهر غلاف الحرف.
- **المنصة:** بطاقة الكورس في صفحة المسار وترويسة صفحة الكورس تستعملانه.
- **لوحة التحكم:** صفحة المسار تعرض غلاف كل كورس بجانب بطاقته؛ صفوف الدروس في صفحة الكورس تعرض مصغّرة الدرس (`LessonThumb`)؛ وحقل الغلاف في تعديل الكورس يعاين صورة أول درس عند غياب المرفوعة (`fallbackUrl`، لا يُحفظ في الحقل).
- **التحقق:** `tsc` نظيف واختبارات الواجهة ناجحة. **لم يُفحص في المتصفح** ولم تُضف اختبارات للدالة الجديدة.

## الخطوة 6: رفع صورة الغلاف في الخلفية مع نسبة التقدم (2026-11-01)
- **المشكلة:** الرفع كان مربوطًا بحقل الغلاف؛ التنقل أثناءه يضيّع النتيجة، والحفظ يتطلب ضغط «حفظ».
- **Application:** `SetPathCoverUseCase` و`SetCourseCoverUseCase` (يغيّران الغلاف وحده، بفحص صلاحية المدير) + اختبار في `admin.usecases.test.ts`.
- **الواجهة:** `components/background-uploads.tsx`: مخزن رفع على مستوى الوحدة (يبقى الرفع جاريًا عند التنقل)، يحفظ الغلاف تلقائيًا عند الانتهاء عبر `saveUploadedCoverAction` ثم يحدّث الصفحة؛ شريط `BackgroundUploads` في `admin/layout.tsx` يعرض النسبة وشريط تقدم. `CoverField` صار يأخذ `target` (المسار/الكورس) ويعرض النسبة محليًا أيضًا.
- **التحقق:** `tsc` وESLint نظيفان، واختبارات application ناجحة (120). **لم يُجرَّب في المتصفح** ولا مع Cloudinary الحقيقي.

## الخطوة 7: ضغط صورة الغلاف في المتصفح قبل الرفع (2026-11-01)
- `compressImage` في `cloudinary-upload.ts`: يصغّر الصورة لأطول ضلع 1600px ويحوّلها WebP بجودة 0.82 عبر Canvas، ويستعملها `uploadImage` فقط (الفيديو لا يمسّه). يُبقي الأصل إن كان GIF/SVG أو فشل الضغط أو لم يصغر الناتج.
- التحقق: `tsc` نظيف. **لم يُجرَّب في المتصفح.**

## الخطوة 8: زر «حفظ» يظهر عند وجود تعديل فقط (2026-11-01)
- **قرار المالك:** في كل نماذج التعديل بالمنصة يختفي زر الحفظ ما لم يتغير شيء، ويظهر فور أول تعديل.
- `components/save-button.tsx`: `SaveButton` يقارن لقطة FormData بلقطة الأصل (يستمع input/change وتغيّر `value` للحقول المخفية)، ويعيد ضبط الأصل بعد انتهاء الإرسال؛ وحدث `qalam:rebase` للغلاف الذي حُفظ تلقائيًا بعد الرفع الخلفي.
- طُبّق على: بيانات المسار، الكورس، الوحدة، المفهوم، الدرس، ملخص الدرس، تعديل السؤال. نماذج الإنشاء والحذف والإجراءات تبقى بأزرارها. **قاعدة للمستقبل:** أي نموذج تعديل جديد يستعمل `SaveButton`.
- **التحقق:** `tsc` وESLint نظيفان. **لم يُجرَّب في المتصفح** لأن الدخول يحتاج رمزًا بالبريد.

## الخطوة 9: كلمة مرور + رمز البريد، وصفحة إنشاء حساب (2026-11-01)
- **قرار المالك:** الدخول لا يكفي فيه رمز البريد وحده؛ المطلوب بريد وكلمة مرور فعليان عند إنشاء الحساب، ولا يُرسل الرمز إلا إذا طابقا.
- **Domain:** `Password` (8–72 حرفًا، حرف ورقم على الأقل) في `value-objects/password.ts`.
- **Application:** `AuthPort` صار فيه `signUp` و`resendCode` و`verifySignUpCode` و`requestSignInCode(email, password)`؛ أخطاء `InvalidCredentialsError` و`EmailAlreadyRegisteredError`؛ حالات استخدام `SignUpUseCase` و`ResendCodeUseCase` و`VerifySignUpCodeUseCase`.
- **Infrastructure:** `SupabaseAuth`: إنشاء الحساب بـ`signUp` (رمز تأكيد بالبريد، ويرفض إن كان «Confirm email» معطّلًا)؛ الدخول يفحص `signInWithPassword` ثم يغلق تلك الجلسة فورًا ثم يرسل `signInWithOtp` بـ`shouldCreateUser: false`؛ الجلسة لا تُفتح إلا بعد الرمز. `DevCookieAuth` يبقى دخولًا مباشرًا بلا كلمة مرور.
- **الواجهة:** صفحة `/signup` جديدة، وإعادة كتابة `/login` (بريد + كلمة مرور ثم رمز)، ومكوّن مشترك `components/auth-code-step.tsx`، وزر «إنشاء حساب» في الترويسة. نفس الرموز التصميمية للصفحات الأخرى. كلمة المرور لا تُحفظ ولا تظهر في الرابط.
- **قيد معروف:** الفحص تطبيقي (في خادمنا). من يملك مفتاح Supabase العام يستطيع استدعاء `signInWithOtp` مباشرة متجاوزًا كلمة المرور، لكنه يحتاج بعدها الوصول إلى بريد الضحية؛ فكلمة المرور عامل إضافي لا حاجز خادمي كامل.
- **الحسابات القديمة:** من دخل سابقًا بالرمز فقط لا كلمة مرور له؛ يحتاج «نسيت كلمة المرور» (لم يُنفَّذ بعد) أو إنشاء حساب جديد.
- **التحقق:** `tsc` وESLint نظيفان، 282 اختبارًا ناجحًا. جُرّبت `/signup` في المتصفح مع Supabase الحقيقي حتى شاشة الرمز. لم يُجرَّب إدخال الرمز الفعلي ولا الدخول.

## الخطوة 10: نسيت كلمة المرور (2026-11-01)
- صفحة `/forgot-password`: البريد ← رمز من 6 أرقام + كلمة المرور الجديدة في نموذج واحد. رابط «نسيت كلمة المرور؟» في `/login`، ورسالة «غُيّرت كلمة المرور» عند العودة.
- **Application/Infrastructure:** `requestPasswordReset` و`resetPassword` في `AuthPort`؛ `SupabaseAuth` يستعمل `resetPasswordForEmail` ثم `verifyOtp(type: 'recovery')` ثم `updateUser`، ويغلق الجلسة المؤقتة دائمًا فيمرّ المتعلم بالدخول الكامل (كلمة المرور ثم الرمز). الرسالة لا تكشف إن كان البريد مسجَّلًا. `CodePurpose` صار يشمل `recovery` لإعادة الإرسال.
- **إعداد Supabase:** قالب **Reset Password** يجب أن يعرض `{{ .Token }}` (محدَّث في `docs/DEPLOYMENT.md`).
- **التحقق:** tsc وESLint واختبارات (286) ناجحة. لم يُجرَّب إرسال/إدخال الرمز الفعلي.

## الخطوة 11: خلفية «الورقة» لكل الصفحات (2026-11-01)
- `body` في `globals.css` صار يحمل نقاط «الورقة» (نفس نمط `.paper`، شفافية 12%) فوق لون السطح، فتظهر في كل الصفحات بالوضعين الفاتح والداكن. البطاقات تبقى على أسطحها الصلبة. عُدّلت الخلفية فقط. **جُرّبت بصريًا في الوضع الداكن فقط.**
