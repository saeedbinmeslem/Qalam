/**
 * @file decision-explanation.ts
 * @description مخطط ومحلّل شرح القرار الذي يصوغه النموذج اللغوي (اختياري). النموذج يصوغ الشرح فقط،
 * ولا يغيّر القرار؛ وناتجه لا يُقبل قبل التحقق منه، وأي ردّ غير صالح يُهمل بصمت (الوكيل يعمل بدونه).
 */

export const DECISION_EXPLANATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation'],
  properties: { explanation: { type: 'string' } },
};

export const MAX_EXPLANATION_LENGTH = 500;

/** يعيد الشرح منظَّفًا، أو null إذا خالف المخطط */
export function parseDecisionExplanation(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = (raw as { explanation?: unknown }).explanation;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length === 0 || text.length > MAX_EXPLANATION_LENGTH) return null;
  return text;
}
