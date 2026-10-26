# مشروع قلم (Qalam)

وكيل ذكاء اصطناعي تعليمي عربي: يحوّل فيديوهات يوتيوب إلى مسار تعلّم شخصي، ويقيس الفهم بتمارين كود حقيقية، ويعدّل الخطة بناءً على أداء المتعلم.
مشروع فردي لمسابقة Create AI Agents Championship (دبي). التسجيل يناير 2027، والنهائي مايو 2027.
التفاصيل الكاملة: @docs/SPEC.md

## قرارات محسومة
- المحتوى التعليمي **عام** (أي موضوع) — صاحب المشروع يتحكم بإدارة الدروس والمسارات يدويًا.
- **C++ في البنية التقنية للمنصة** — تُستخدم C++ حصرًا في العمليات الحرجة للأداء التي لا تؤديها TypeScript بنفس الكفاءة:
  - `services/evaluator` — محرّك تشغيل كود الطالب (عزل أمني + حدود صارمة). لا تكتب sandbox من الصفر.
  - `services/graph-engine` — خوارزميات الـ concept graph (أقصر مسار تعلم، ترتيب المتطلبات السابقة).
  - `services/spaced-repetition` — حسابات المراجعة المتباعدة على نطاق واسع (batch).
  - `services/adaptation-engine` — تقييم قواعد التكيّف على نطاق واسع.
  - كل خدمة C++ تتواصل مع TypeScript عبر عقد JSON موثّق في `docs/`.
- باقي النظام: TypeScript (Next.js + Supabase/Postgres + Claude API + YouTube API)
- الواجهة عربية أولًا (RTL)
- الهيكلة: Clean Architecture (انظر أدناه)

## Clean Architecture (إلزامية)
- الاعتماد يتجه للداخل فقط: Presentation → Application → Domain. Infrastructure تنفّذ ports معرّفة في Application.
- `packages/domain` و`packages/application` لا تستوردان أي إطار أو خدمة خارجية (Next.js, Supabase, YouTube, Claude SDK).
- كل خدمة خارجية خلف port، ولها تنفيذ وهمي (fake) للاختبار.
- حلقة قرار الوكيل في `packages/application/src/agent`، والنموذج اللغوي يُستدعى عبر port `LlmClient`.
- مخرجات النموذج اللغوي تُتحقق بمخطط (schema) قبل دخولها للـ Domain.
- Presentation (apps/web) بدون منطق عمل: تحوّل الطلب إلى use case فقط.
- محرّك C++ (كل خدمة C++) بنفس المبدأ: domain / usecases / ports / adapters، و`main.cpp` هو composition root.
- الاتصال بين TypeScript وأي خدمة C++ عبر عقد JSON موثّق في `docs/<service>-contract.md` (يُكتب قبل التنفيذ).

## هيكل المجلدات
```
apps/web                     # Presentation
packages/domain              # كيانات وقواعد
packages/application         # use cases + ports + agent
packages/infrastructure      # adapters
services/evaluator           # محرّك التقييم (C++) — تشغيل كود الطالب
services/graph-engine        # خوارزميات concept graph (C++) — أقصر مسار تعلم
services/spaced-repetition   # حسابات المراجعة المتباعدة (C++) — batch
services/adaptation-engine   # قواعد التكيّف على نطاق واسع (C++)
docs/                        # SPEC.md + عقود JSON لكل خدمة C++
tests/                       # end-to-end
```

## قواعد العمل
- اقرأ docs/SPEC.md قبل كتابة أي كود، وابدأ من المرحلة 0 في القسم 12.
- ابنِ على مراحل، وكل مرحلة تعمل end-to-end قبل الانتقال للتي بعدها.
- اسألني عن القرارات المعلّقة ولا تفترضها بصمت. القرارات المحسومة الآن: قناة التذكيرات = بريد (Resend)، فئة المسابقة = مجتمعي، مستوى التوثيق = مفصّل مع تعليقات شارحة.
- اكتب اختبارات تلقائية لمنطق التقييم والتكيّف وقواعد الـ Domain.
- سجّل أحداث قياس الأثر (المحاولات، الإكمال، قرارات الخطة وأسبابها) من البداية.
- فضّل البساطة: أقل عدد خدمات ممكن، فالمشروع يبنيه فرد واحد.

## قيود قانونية وجودة
- يوتيوب: تضمين وروابط زمنية فقط. لا نسخ ولا إعادة استضافة للفيديوهات، ولا تفترض توفر النص المفرّغ.
- عرض اسم القناة والمصدر دائمًا.
- أي سؤال أو ملخص مولَّد يُبنى على مصدر الدرس، وتُراجع عينات منه يدويًا.
- كود الطالب غير موثوق: لا يُنفَّذ إلا داخل محرّك التقييم المعزول.
