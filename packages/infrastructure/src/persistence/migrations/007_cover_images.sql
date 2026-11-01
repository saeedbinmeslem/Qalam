-- صور غلاف اختيارية للمسار والكورس (رابط Cloudinary نصًا). الفارغ = غلاف الحرف المولَّد في الواجهة.
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover_url TEXT;
