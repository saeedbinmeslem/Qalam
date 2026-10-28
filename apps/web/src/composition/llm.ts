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

  // GEMINI_MODEL قائمة اختيارية مفصولة بفواصل؛ بدونها تُستعمل قائمة النماذج الافتراضية مع الانتقال عند الضغط
  if (provider === 'gemini' && gemini) return new GeminiLlmClient(gemini, process.env.GEMINI_MODEL || undefined);
  if (provider === 'anthropic' && anthropic) {
    return createAnthropicLlmClient(anthropic, process.env.ANTHROPIC_MODEL || undefined);
  }
  return unconfiguredLlmClient;
}

/** مهلة صياغة شرح القرار: الشرح اختياري فلا يُبطئ التسليم أكثر من هذا */
const AGENT_EXPLAIN_TIMEOUT_MS = 8000;

/** عميل للوكيل: بلا مفتاح يعيد undefined (الوكيل يعمل بالقواعد وحدها)، ومعه يُحدّ بمهلة */
export function getAgentLlmClient(): LlmClient | undefined {
  const client = getLlmClient();
  if (client === unconfiguredLlmClient) return undefined;
  return {
    generateJson: (request) =>
      Promise.race([
        client.generateJson(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('انتهت مهلة صياغة الشرح')), AGENT_EXPLAIN_TIMEOUT_MS),
        ),
      ]),
  };
}
