-- ==============================================================================
-- مشروع قلم (Qalam) — الهجرة 003: ملاحظات الدرس وأسئلة الاختبارات
-- ==============================================================================

-- ملاحظات المالك عن محتوى الدرس: المصدر الوحيد لتوليد الأسئلة بالذكاء الاصطناعي (لا تُعرض للمتعلم)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS notes TEXT;

-- أسئلة الاختيار من متعدد. مسودات الذكاء الاصطناعي لا تُقرأ إلا بمفتاح الخدمة (لوحة التحكم)؛
-- المتعلم يقرأ المعتمد فقط.
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id VARCHAR(100) PRIMARY KEY,
    lesson_id VARCHAR(100) REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    concept_id VARCHAR(100) REFERENCES public.concepts(id) ON DELETE RESTRICT NOT NULL,
    prompt TEXT NOT NULL,
    choices JSONB NOT NULL,
    correct_index INT NOT NULL CHECK (correct_index >= 0),
    explanation TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    origin VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (origin IN ('ai', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS quiz_questions_lesson_idx ON public.quiz_questions (lesson_id);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- ملاحظة أمنية: عمود correct_index يُقرأ هنا، لذا تصحيح الاختبار يجري في الخادم فقط
-- (الواجهة لا تستعلم هذا الجدول مباشرة)، وقراءة المتعلم المباشرة تُترك مغلقة عمدًا.
CREATE POLICY "لا وصول مباشر لأسئلة الاختبارات"
    ON public.quiz_questions
    FOR SELECT
    USING (false);
