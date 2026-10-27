/**
 * @file generated-questions.ts
 * @description مخطط ومحلّل ناتج النموذج اللغوي لتوليد الأسئلة. لا يدخل Domain شيء من النموذج
 * قبل أن يمرّ من هنا (قاعدة المشروع: مخرجات النموذج تُتحقق بمخطط).
 */

export interface GeneratedQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

/** JSON Schema المرسل للنموذج (structured outputs) */
export const GENERATED_QUESTIONS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['prompt', 'choices', 'correctIndex', 'explanation'],
        properties: {
          prompt: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

const fail = (detail: string): never => {
  throw new Error(`ردّ النموذج غير صالح: ${detail}`);
};

/** تحقق يدوي صارم (Application لا يستورد مكتبات التحقق الخارجية) */
export function parseGeneratedQuestions(raw: unknown): GeneratedQuestion[] {
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as { questions?: unknown }).questions)) {
    return fail('لا توجد قائمة أسئلة');
  }
  return ((raw as { questions: unknown[] }).questions).map((item, index) => {
    const q = item as Partial<GeneratedQuestion> | null;
    if (!q || typeof q.prompt !== 'string' || typeof q.explanation !== 'string') return fail(`السؤال ${index + 1} ناقص`);
    if (!Array.isArray(q.choices) || q.choices.some((c) => typeof c !== 'string')) return fail(`خيارات السؤال ${index + 1}`);
    if (typeof q.correctIndex !== 'number') return fail(`الإجابة الصحيحة للسؤال ${index + 1}`);
    return { prompt: q.prompt, choices: q.choices as string[], correctIndex: q.correctIndex, explanation: q.explanation };
  });
}
