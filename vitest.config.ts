/// <reference types="vitest" />

// إعدادات Vitest — إطار الاختبارات الرئيسي للمشروع
// يبحث عن ملفات الاختبار في جميع الحزم الفرعية
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // البحث عن ملفات الاختبار في جميع الحزم
    include: ['packages/*/src/**/*.test.ts'],

    // بيئة التشغيل: Node.js
    environment: 'node',

    // السماح بالمرور في حال عدم وجود ملفات اختبار بعد
    passWithNoTests: true,
  },
});
