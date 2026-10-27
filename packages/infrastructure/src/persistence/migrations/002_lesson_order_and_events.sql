-- ==============================================================================
-- مشروع قلم (Qalam) — الهجرة 002: ترتيب الدروس وجدول أحداث قياس الأثر
-- ==============================================================================

-- ترتيب الدرس داخل وحدته (كان الترتيب غير مضمون)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS order_index INT NOT NULL DEFAULT 1 CHECK (order_index >= 1);

-- أحداث قياس الأثر (القسم 10 من SPEC): إكمال، محاولات، قرارات الخطة وأسبابها...
-- الكتابة عبر الخادم فقط باسم المتعلم الحالي، والقراءة لصاحب الحدث وحده.
CREATE TABLE IF NOT EXISTS public.learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS learning_events_user_time_idx ON public.learning_events (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS learning_events_type_idx ON public.learning_events (type);

ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المتعلم يسجّل أحداثه ويقرؤها فقط"
    ON public.learning_events
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
