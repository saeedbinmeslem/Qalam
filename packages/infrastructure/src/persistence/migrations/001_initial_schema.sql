-- ==============================================================================
-- مشروع قلم (Qalam) — مخطط قاعدة البيانات الأولي (المرحلة 0)
-- متوافق مع PostgreSQL و Supabase مع تفعيل أمان مستوى الصفوف (Row Level Security)
-- ==============================================================================

-- تفعيل ملحق UUID لتوليد المعرّفات الفريدة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. جدول المتعلّمين (Learners)
-- يربط مع جدول المستخدمين في مصادقة Supabase (auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    learning_goal TEXT DEFAULT '',
    weekly_available_hours INT DEFAULT 5 CHECK (weekly_available_hours > 0),
    current_level VARCHAR(50) DEFAULT 'beginner' CHECK (current_level IN ('beginner', 'intermediate', 'advanced')),
    active_path_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. جدول المفاهيم التعليمية (Concepts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.concepts (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    level INT DEFAULT 1 CHECK (level >= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. جدول المتطلبات السابقة للمفاهيم (Concept Prerequisites)
-- يربط كل مفهوم بالمفاهيم التي يجب إتقانها مسبقاً (رسم بياني موجه DAG)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.concept_prerequisites (
    concept_id VARCHAR(100) REFERENCES public.concepts(id) ON DELETE CASCADE,
    prerequisite_concept_id VARCHAR(100) REFERENCES public.concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (concept_id, prerequisite_concept_id),
    CHECK (concept_id <> prerequisite_concept_id)
);

-- ------------------------------------------------------------------------------
-- 4. جدول المسارات التعليمية (Learning Paths)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    target_goal TEXT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. جدول الوحدات التعليمية (Modules)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modules (
    id VARCHAR(100) PRIMARY KEY,
    path_id VARCHAR(100) REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    order_index INT NOT NULL CHECK (order_index >= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. جدول الدروس (Lessons)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
    id VARCHAR(100) PRIMARY KEY,
    module_id VARCHAR(100) REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    concept_id VARCHAR(100) REFERENCES public.concepts(id) ON DELETE RESTRICT NOT NULL,
    title VARCHAR(255) NOT NULL,
    video_id VARCHAR(50) NOT NULL,
    start_seconds INT NOT NULL CHECK (start_seconds >= 0),
    end_seconds INT NOT NULL CHECK (end_seconds > start_seconds),
    source_url TEXT NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'ar',
    summary TEXT,
    reviewed_by_human BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. جدول حالات إتقان المفاهيم لكل متعلّم (Learner Concept States)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_concept_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID REFERENCES public.learners(id) ON DELETE CASCADE NOT NULL,
    concept_id VARCHAR(100) REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
    level VARCHAR(50) DEFAULT 'not_started' CHECK (level IN ('not_started', 'studying', 'mastered', 'needs_review')),
    confidence_score NUMERIC(3, 2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (learner_id, concept_id)
);

-- ------------------------------------------------------------------------------
-- سياسات أمان مستوى الصفوف (Row Level Security - RLS)
-- ------------------------------------------------------------------------------

-- تفعيل RLS على جدول المتعلّمين
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المتعلم يمكنه قراءة وتعديل بياناته فقط"
    ON public.learners
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- تفعيل RLS على جدول حالة إتقان المفاهيم
ALTER TABLE public.learner_concept_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المتعلم يرى ويعدل سجل إتقانه فقط"
    ON public.learner_concept_states
    FOR ALL
    USING (
        learner_id IN (
            SELECT id FROM public.learners WHERE user_id = auth.uid()
        )
    );

-- المسارات والمفاهيم والدروس متاحة للقراءة للجميع
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المسارات متاحة للقراءة للجميع" ON public.learning_paths FOR SELECT USING (true);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الوحدات متاحة للقراءة للجميع" ON public.modules FOR SELECT USING (true);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الدروس متاحة للقراءة للجميع" ON public.lessons FOR SELECT USING (true);

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المفاهيم متاحة للقراءة للجميع" ON public.concepts FOR SELECT USING (true);

ALTER TABLE public.concept_prerequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المتطلبات السابقة متاحة للقراءة للجميع" ON public.concept_prerequisites FOR SELECT USING (true);
