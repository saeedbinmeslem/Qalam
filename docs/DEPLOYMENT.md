# دليل النشر (Supabase + Vercel)

ما يلزمك أنت (لا أستطيع إنشاء حسابات): مشروع Supabase ومشروع Vercel. الباقي جاهز في الكود.

## 1) Supabase
1. أنشئ مشروعًا في supabase.com، ثم من SQL Editor شغّل بالترتيب الملفات في `packages/infrastructure/src/persistence/migrations/`: `001` ثم `002` ثم `003`.
2. من Project Settings → API انسخ: `Project URL` و`anon key` و`service_role key` (الأخير سري: خادم فقط).
3. من Authentication → URL Configuration أضف رابط موقعك ورابط `/auth/callback` ضمن Redirect URLs.

## 2) نقل المحتوى
ضع المفاتيح في `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=بريدك
GEMINI_API_KEY=...
```
ثم:
```
npx tsc --build
npm run seed-supabase
```
ينقل المفاهيم والمسار والدروس والمسودات من لقطتك المحلية كما هي (لا يعتمد شيئًا).

## 3) Vercel
استورد المستودع، واجعل Root Directory = `apps/web` (مع تفعيل تضمين ملفات خارج الجذر، فالحزم داخل monorepo)، وأمر البناء `npm run build`، وأضف نفس المتغيرات أعلاه في Environment Variables. في الإنتاج بلا `ADMIN_EMAILS` لا يدخل أحد للوحة التحكم، وبلا مفاتيح Supabase لا يُفعَّل الدخول.

## 4) بعد النشر (عملك أنت)
ادخل `/admin`، شاهد كل درس وعدّل مقطعه، وراجع الملاحظات والأسئلة المسودة ثم اعتمدها. لا يراها المتعلم قبل اعتمادك.
