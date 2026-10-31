-- ==============================================================================
-- مشروع قلم (Qalam) — الهجرة 005: الهيكل الجديد  مسار ← مفهوم ← كورس ← وحدة ← درس
-- ==============================================================================
-- تنبيه: هجرة **مدمّرة بقرار المالك**. المفهوم صار تابعًا لمسار واحد، والدرس لا يُنسب لمفهوم بمفرده بل يتبع
-- كورسًا يتبع مفهومًا، فلا طريق لتحويل البيانات القديمة آليًا. تُحذف المسارات والمفاهيم والدروس وأسئلة
-- الاختبارات وحالات الإتقان، ثم يُعاد الاستيراد من لوحة التحكم (رابط القائمة فقط).
-- لا تُحذف: المتعلمون وسجل الأحداث (events) وبيانات الدخول.
-- شغّلها مرة واحدة في Supabase > SQL Editor.

TRUNCATE TABLE public.quiz_questions,
               public.learner_concept_states,
               public.lessons,
               public.modules,
               public.concept_prerequisites,
               public.concepts,
               public.learning_paths
    CASCADE;

-- المفهوم يتبع مسارًا واحدًا
ALTER TABLE public.concepts
    ADD COLUMN IF NOT EXISTS path_id VARCHAR(100) NOT NULL
    REFERENCES public.learning_paths(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS concepts_path_idx ON public.concepts (path_id);

-- الكورس: يتبع مسارًا ومفهومًا. المفتاح الأجنبي للمفهوم بلا CASCADE (NO ACTION يُفحص في نهاية الجملة)
-- فيمرّ حذف المسار الذي يحذف كورساته ومفاهيمه معًا، ويمنع تطبيق use case حذف مفهوم له كورسات
CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(100) PRIMARY KEY,
    path_id VARCHAR(100) REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
    concept_id VARCHAR(100) REFERENCES public.concepts(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    order_index INT NOT NULL CHECK (order_index >= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS courses_path_idx ON public.courses (path_id);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الكورسات متاحة للقراءة للجميع" ON public.courses FOR SELECT USING (true);

-- الوحدة تتبع كورسًا (ترتيبها داخله)، ولا يلزمها path_id بعد الآن
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS course_id VARCHAR(100) NOT NULL
    REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.modules ALTER COLUMN path_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS modules_course_idx ON public.modules (course_id);

-- الدرس لا يحمل مفهومًا: مفهومه من كورسه
ALTER TABLE public.lessons DROP COLUMN IF EXISTS concept_id;

-- حذف مسار يحذف مفاهيمه وكورساته ودروسه وأسئلتها معًا: نجعل مفتاح مفهوم السؤال NO ACTION (لا RESTRICT الفوري)
ALTER TABLE public.quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_concept_id_fkey;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_concept_id_fkey
    FOREIGN KEY (concept_id) REFERENCES public.concepts(id);
