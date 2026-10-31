-- سجل العمليات الخلفية الطويلة (الملاحظات والملخصات، استيراد القوائم): تظهر حالتها في لوحة التحكم.
-- لا سياسات قراءة: يُقرأ ويُكتب بمفتاح الخدمة من الخادم فقط.
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id VARCHAR(100) PRIMARY KEY,
    job_key VARCHAR(300) NOT NULL,
    label TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'done', 'failed')),
    message TEXT DEFAULT '',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS background_jobs_started_idx ON public.background_jobs (started_at DESC);
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
