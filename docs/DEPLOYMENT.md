# دليل النشر (Supabase + Vercel)

ما يلزمك أنت (لا أستطيع إنشاء حسابات): مشروع Supabase ومشروع Vercel. الباقي جاهز في الكود.

## 1) Supabase
1. أنشئ مشروعًا في supabase.com، ثم من SQL Editor شغّل بالترتيب الملفات في `packages/infrastructure/src/persistence/migrations/`: `001` ثم `002` ثم `003` ثم `004` (فيديو Cloudinary وملخص القراءة) ثم `005` (الهيكل الجديد مسار ← مفهوم ← كورس ← وحدة ← درس). **تنبيه: `005` مدمّرة** (تحذف المسارات والمفاهيم والدروس وأسئلتها وحالات الإتقان، وتُبقي المتعلمين والأحداث) فشغّلها ثم أعد الاستيراد من لوحة التحكم (رابط القائمة فقط). ثم `007` (أعمدة `cover_url` لصور غلاف المسارات والكورسات، غير مدمّرة). **شغّل `007` قبل نشر الكود الجديد**، وإلا فشل حفظ أي مسار أو كورس لأن الكود يكتب العمود.
2. من Project Settings → API انسخ: `Project URL` و`anon key` و`service_role key` (الأخير سري: خادم فقط).
3. **الدخول برمز من 6 أرقام** (لا رابط سحري، فلا حاجة لـ Redirect URLs). الإعداد الافتراضي لبريد Supabase لا يصلح للإنتاج: حدّه بضع رسائل في الساعة (لذلك تصل قليلة)، والمرسل «Supabase Auth». أصلح ذلك بالخطوات:
   0. **الأسرع بلا نطاق (موصى به): Brevo.** سجّل في brevo.com (مجاني، 300 رسالة/يوم)، ثم Senders → أضف بريدك مرسلًا وفعّله بالرابط الذي يصلك، ثم SMTP & API → SMTP keys → أنشئ مفتاحًا. في Supabase → Authentication → Emails → SMTP Settings: المضيف `smtp-relay.brevo.com`، المنفذ `587`، المستخدم = بريد حسابك في Brevo، كلمة المرور = مفتاح SMTP، عنوان المرسل = بريدك الذي فعّلته، **اسم المرسل `قلم`**. ثم ارفع Emails sent per hour من Rate Limits. لا تغيير في الكود. (EmailJS غير مناسب: مصمم لاستدعاء المتصفح، حده 200 رسالة/شهر، ولا يُربط بـ SMTP في Supabase.)
   1. **بديل: بريد مرسل باسم قلم عبر Resend (يتطلب نطاقًا خاصًا):** أنشئ حسابًا في resend.com وأضف نطاقك وتحقق منه (سجلات DNS)، وأنشئ API key. ثم في Supabase: Authentication → Emails → SMTP Settings → فعّل Custom SMTP: المضيف `smtp.resend.com`، المنفذ `465`، المستخدم `resend`، كلمة المرور = مفتاح Resend، عنوان المرسل مثل `login@نطاقك`، **واسم المرسل `قلم`**. بعدها يرتفع الحد (من Authentication → Rate Limits، حقل Emails sent per hour).
   2. **قالب الرسالة:** Authentication → Emails → Templates، في القالبين **Magic Link** و**Confirm signup**: الصق محتوى `docs/email-templates/login-code.html` (فيه `{{ .Token }}` وهو الرمز) واجعل العنوان `{{ .Token }} هو رمز الدخول إلى قلم`.
   3. طول الرمز: Authentication → Sign In / Providers → Email → Email OTP Length = 6، ومدة الصلاحية Email OTP Expiration (الافتراضي ساعة؛ يُنصح بـ 600 ثانية).

## 2) نقل المحتوى
ضع المفاتيح في `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=بريدك
GEMINI_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
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
