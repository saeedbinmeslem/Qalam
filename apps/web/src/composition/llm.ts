/**
 * @file llm.ts
 * @description يربط منفذ LlmClient بمزوّد الذكاء الاصطناعي حسب المفاتيح المتوفرة:
 * 1) LLM_PROVIDER صريح (gemini | anthropic)، وإلا
 * 2) GEMINI_API_KEY (مجاني للبدء) ثم ANTHROPIC_API_KEY، وإلا
 * 3) عميل غير مضبوط يفشل برسالة واضحة فتعمل بقية المنصة.
 * النموذج اختياري: GEMINI_MODEL / ANTHROPIC_MODEL.
 */
import type { LlmClient } from '@qalam/application';
import {
  GeminiLlmClient,
  createAnthropicLlmClient,
  unconfiguredLlmClient,
} from '@qalam/infrastructure';

export function getLlmClient(): LlmClient {
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const provider = process.env.LLM_PROVIDER || (gemini ? 'gemini' : anthropic ? 'anthropic' : '');

  if (provider === 'gemini' && gemini) return new GeminiLlmClient(gemini, process.env.GEMINI_MODEL || undefined);
  if (provider === 'anthropic' && anthropic) {
    return createAnthropicLlmClient(anthropic, process.env.ANTHROPIC_MODEL || undefined);
  }
  return unconfiguredLlmClient;
}
