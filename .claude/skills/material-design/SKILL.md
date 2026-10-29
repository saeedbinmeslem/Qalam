---
name: material-design
description: Material Design 3 (m3.material.io) and MUI (mui/material-ui) design rules adapted for Qalam's Arabic RTL web app and admin dashboard. Use when building or restyling any UI in apps/web (pages, forms, buttons, cards, tables, navigation, admin screens).
---

# Material Design 3 لمنصة قلم

المرجع: m3.material.io (النظام) وgithub.com/mui/material-ui (تطبيقه البرمجي). نحن **لا نستخدم MUI كمكتبة** (Tailwind 4 + رموز CSS)، بل نأخذ منطقه: رموز دلالية، متغيرات مكوّنات (variants)، حالات تفاعل موحّدة.
> ملاحظة: كُتبت القيم من معرفة M3 المنشورة (تعذّر جلب صفحات m3.material.io كنص)؛ راجعها مع الموقع عند أي شك.

## 1. اللون: أدوار دلالية لا ألوان خام
الرموز في `apps/web/src/app/globals.css` (`@theme`). استخدم الدور، لا الدرجة:
| الدور | الاستخدام |
|---|---|
| `primary` / `on-primary` | الإجراء الرئيسي (زر معبّأ)، الروابط |
| `primary-container` / `on-primary-container` | تمييز ناعم (شارة، عنصر نشط، زر tonal) |
| `secondary-container` | أزرار tonal، شرائح التصفية |
| `tertiary-container` | تنبيه/تمييز دافئ (العنبري = قلم التمييز) |
| `surface`، `surface-container-{lowest..highest}` | الخلفية ثم البطاقات بحسب العمق؛ الأعلى = أبرز |
| `on-surface` / `on-surface-variant` | النص الأساسي / الثانوي |
| `outline` / `outline-variant` | حدود الحقول / فواصل البطاقات |
| `error` / `error-container` | الأخطاء والحذف |
- التباين: نص على `X` يستخدم دائمًا `on-X`. لا تخلط.
- لا ألوان hex داخل المكوّنات؛ أضف دورًا جديدًا في `globals.css` أولًا.

## 2. الأشكال (Shape scale)
xs 4px · sm 8px · md 12px (بطاقات، حقول) · lg 16px · xl 28px (حوارات) · full (أزرار، شرائح، شارات).
الأزرار والشرائح **pill** (`rounded-full`)، البطاقات `rounded-xl`(12-16)، الحقول `rounded-lg`.

## 3. الطباعة (Type scale)
فئات جاهزة: `text-display` (36/44)، `text-headline` (28/36)، `text-title` (22/28)، `text-body` (16/28 للعربية)، `text-label` (14/20 وزن 600). الخط مدى. العربية تحتاج ارتفاع سطر أكبر من الإنجليزية في M3؛ لا تقلّ عن 1.6 للفقرات.

## 4. الارتفاع والعمق
مستويات 0–3 فقط. فضّل **لون السطح** على الظل: بطاقة = `surface-container-lowest` أو `-low` + حد `outline-variant`؛ الظل (`elevation-1/2`) لعناصر عائمة فقط (قائمة، شريط عائم).

## 5. المكوّنات (متغيرات MUI)
فئات في `globals.css` (`@layer components`)، وتصدّرها `components/admin-ui.tsx` للـ TSX:
- **Button:** `btn-filled` (primary) · `btn-tonal` (secondary-container) · `btn-outlined` · `btn-text` · `btn-danger`. ارتفاع 40px، حشو أفقي 24px، pill.
- **Card:** `card-elevated` / `card-filled` / `card-outlined`.
- **Chip/Badge:** `chip`، `chip-primary`، `chip-warn`.
- **TextField:** `field` (outlined، تسمية فوق الحقل، نص مساعد `field-hint`).
- **Navigation:** شريط علوي `surface-container` + عناصر `nav-item` (aria-current يعطي pill بـ `secondary-container`).

## 6. حالات التفاعل (State layers)
طبقة لونية فوق المكوّن: hover 8% · focus 12% · pressed 12% · disabled (محتوى 38%، حاوية 12%). نُفّذت عبر `color-mix` في الفئات؛ لا تكتب hover لوني يدويًا. حلقة التركيز `:focus-visible` ظاهرة دائمًا (إتاحة).

## 7. التباعد والتخطيط
شبكة 4px (استخدم مضاعفات 4 في Tailwind: 1، 2، 3، 4، 6، 8). حواف الصفحة 16px موبايل/24px ديسكتوب. أهداف اللمس ≥ 48×48 فعليًا (ارتفاع الزر 40 + هامش). تخطيط متجاوب: عمود واحد < 600px، ثم شبكة.

## 8. RTL (إلزامي)
استخدم الخصائص المنطقية فقط: `ms-/me-/ps-/pe-/start/end`، `inset-inline-*`، `text-start`. لا `left/right`. الأيقونات الاتجاهية تُعكس؛ الأرقام والروابط والتوقيتات `dir="ltr"`.

## 9. لوحة التحكم (Admin)
- صفحة = عنوان `text-headline` + إجراء رئيسي واحد `btn-filled` في الأعلى، والباقي tonal/outlined.
- الجداول والقوائم: صفوف على `card-outlined`، فاصل `outline-variant`، حالة الصف بـ `chip`.
- الإجراء المدمّر `btn-danger` مع تأكيد (`confirm-submit`)، لا يكون الأبرز.
- الأخطاء `ErrorBanner` بدور `error-container`.

## 10. قواعد عدم الإفراط
- إجراء رئيسي واحد لكل شاشة. لا أكثر من مستويين من تمييز الأزرار متجاورين.
- لا حركة زخرفية؛ انتقالات 150–200ms للحالات فقط، وتُعطّل مع `prefers-reduced-motion`.
- المحتوى التعليمي (الفيديو والنص) هو البطل؛ الواجهة تخدمه ولا تنافسه.
