// إعدادات ESLint — أداة فحص جودة الكود
// نستخدم الإعداد المسطح (flat config) الجديد في ESLint 9+

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // القواعد الأساسية الموصى بها من ESLint
  eslint.configs.recommended,

  // القواعد الموصى بها لـ TypeScript
  ...tseslint.configs.recommended,

  // تجاهل مجلدات البناء والتبعيات
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/next-env.d.ts', 'coverage/**'],
  },

  // إعدادات عامة لجميع ملفات TypeScript
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    rules: {
      // السماح باستخدام _ للمتغيرات غير المستخدمة (مفيد أحياناً)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // قواعد العمارة النظيفة (Clean Architecture)
  // هذه القواعد تمنع طبقة الـ domain من الاعتماد على أي شيء خارجي
  // ═══════════════════════════════════════════════════════════════════

  // قواعد حزمة domain — الطبقة الأساسية التي لا تعتمد على أي حزمة أخرى
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@qalam/infrastructure', '@qalam/infrastructure/*'],
              message: '❌ طبقة الـ domain لا يمكنها الاستيراد من infrastructure — هذا يخالف مبادئ العمارة النظيفة',
            },
            {
              group: ['@qalam/application', '@qalam/application/*'],
              message: '❌ طبقة الـ domain لا يمكنها الاستيراد من application — الـ domain طبقة مستقلة تماماً',
            },
            {
              group: ['next', 'next/*'],
              message: '❌ طبقة الـ domain لا يمكنها الاستيراد من Next.js — هذه تفاصيل تنفيذية',
            },
            {
              group: ['@supabase/*'],
              message: '❌ طبقة الـ domain لا يمكنها الاستيراد من Supabase — استخدم المنافذ (ports) بدلاً من ذلك',
            },
            {
              group: ['@anthropic-ai/*'],
              message: '❌ طبقة الـ domain لا يمكنها الاستيراد من Anthropic — استخدم المنافذ (ports) بدلاً من ذلك',
            },
            {
              group: ['googleapis', 'googleapis/*'],
              message: '❌ طبقة الـ domain لا يمكنها الاستيراد من Google APIs — استخدم المنافذ (ports) بدلاً من ذلك',
            },
          ],
        },
      ],
    },
  },

  // قواعد حزمة application — تعتمد فقط على domain
  {
    files: ['packages/application/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@qalam/infrastructure', '@qalam/infrastructure/*'],
              message: '❌ طبقة الـ application لا يمكنها الاستيراد من infrastructure — استخدم المنافذ (ports) بدلاً من ذلك',
            },
            {
              group: ['next', 'next/*'],
              message: '❌ طبقة الـ application لا يمكنها الاستيراد من Next.js — هذه تفاصيل تنفيذية',
            },
            {
              group: ['@supabase/*'],
              message: '❌ طبقة الـ application لا يمكنها الاستيراد من Supabase — استخدم المنافذ (ports) بدلاً من ذلك',
            },
            {
              group: ['@anthropic-ai/*'],
              message: '❌ طبقة الـ application لا يمكنها الاستيراد من Anthropic — استخدم المنافذ (ports) بدلاً من ذلك',
            },
            {
              group: ['googleapis', 'googleapis/*'],
              message: '❌ طبقة الـ application لا يمكنها الاستيراد من Google APIs — استخدم المنافذ (ports) بدلاً من ذلك',
            },
          ],
        },
      ],
    },
  },
);
