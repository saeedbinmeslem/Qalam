/// <reference types="vitest" />

// إعدادات Vitest — إطار الاختبارات الرئيسي للمشروع
// يبحث عن ملفات الاختبار في جميع الحزم الفرعية
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // مكوّنات .tsx في apps/web تُعرض في الاختبارات بـ JSX الآلي (بلا import React)
  esbuild: { jsx: 'automatic' },
  test: {
    // البحث عن ملفات الاختبار في جميع الحزم
    include: ['packages/*/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],

    // بيئة التشغيل: Node.js
    environment: 'node',

    // السماح بالمرور في حال عدم وجود ملفات اختبار بعد
    passWithNoTests: true,
  },
});
