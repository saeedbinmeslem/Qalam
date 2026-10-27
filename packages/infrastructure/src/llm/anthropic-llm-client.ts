/**
 * @file anthropic-llm-client.ts
 * @description محوّل منفذ LlmClient على Claude عبر حزمة Anthropic الرسمية.
 * - الناتج JSON مقيَّد بمخطط (structured outputs)، ومع ذلك يتحقق منه الـ use case قبل Domain.
 * - fallbacks "default": عند رفض أمني يعيد الخادم التشغيل على نموذج بديل داخل الطلب نفسه.
 * - الثبات: لا نمرّر temperature ولا prefill ولا tool_choice إجباريًا (تُرفض على هذه النماذج).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient, LlmJsonRequest } from '@qalam/application';

/** النموذج الافتراضي للمنصة؛ يُغيَّر بـ ANTHROPIC_MODEL */
export const DEFAULT_MODEL = 'claude-opus-5-5';

interface ResponseLike {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string | null;
}

/** الجزء الذي نحتاجه من العميل (يسمح باختباره بعميل وهمي دون شبكة) */
export interface AnthropicBetaMessages {
  beta: { messages: { create(params: Record<string, unknown>): PromiseLike<ResponseLike> } };
}

export class AnthropicLlmClient implements LlmClient {
  constructor(
    private readonly client: AnthropicBetaMessages,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    let response: ResponseLike;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: request.schema } },
      });
    } catch (error) {
      throw translateError(error);
    }

    if (response.stop_reason === 'refusal') {
      throw new Error('رفض النموذج توليد هذا المحتوى. عدّل ملاحظات الدرس وأعد المحاولة');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('انقطع ردّ النموذج لطوله. اطلب عددًا أقل من الأسئلة');
    }

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('ردّ النموذج ليس JSON صالحًا');
    }
  }
}

/** رسائل عربية واضحة بدل أخطاء الشبكة الخام */
function translateError(error: unknown): Error {
  if (error instanceof Anthropic.AuthenticationError) return new Error('مفتاح Claude (ANTHROPIC_API_KEY) غير صالح');
  if (error instanceof Anthropic.RateLimitError) return new Error('تجاوزنا حد الطلبات لدى Claude. أعد المحاولة بعد قليل');
  if (error instanceof Anthropic.BadRequestError) return new Error(`رفض Claude الطلب: ${error.message}`);
  if (error instanceof Anthropic.APIConnectionError) return new Error('تعذّر الاتصال بخدمة Claude');
  if (error instanceof Anthropic.APIError) return new Error(`خطأ من خدمة Claude (${error.status}): ${error.message}`);
  return error instanceof Error ? error : new Error('خطأ غير متوقع أثناء استدعاء Claude');
}

/** يبني العميل الفعلي؛ SDK يقرأ المفتاح من البيئة أو نمرّره صراحة */
export function createAnthropicLlmClient(apiKey: string, model?: string): AnthropicLlmClient {
  return new AnthropicLlmClient(new Anthropic({ apiKey }) as unknown as AnthropicBetaMessages, model);
}

/** عند غياب المفتاح: يفشل بوضوح بدل أخطاء غامضة، فتعمل بقية المنصة بلا Claude */
export const unconfiguredLlmClient: LlmClient = {
  generateJson: async () => {
    throw new Error(
      'ميزة الذكاء الاصطناعي غير مفعّلة: اضبط GEMINI_API_KEY (مفتاح مجاني من aistudio.google.com/apikey) أو ANTHROPIC_API_KEY في إعدادات الخادم',
    );
  },
};
