-- النصوص المفرّغة لفيديوهات يوتيوب: مصدر داخلي لإعداد الدروس في لوحة التحكم (ملاحظات ← ملخص ← أسئلة).
-- تُجلب مرة واحدة لكل فيديو وتُخزَّن؛ لا تُعرض للمتعلم. لا سياسات قراءة: مفتاح الخدمة من الخادم فقط.
CREATE TABLE IF NOT EXISTS public.video_transcripts (
    video_id VARCHAR(20) PRIMARY KEY,
    segments JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.video_transcripts ENABLE ROW LEVEL SECURITY;
