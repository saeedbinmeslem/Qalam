/**
 * @file openai-compatible-llm-client.ts
 * @description محوّل منفذ LlmClient على أي خدمة بواجهة OpenAI `chat/completions`.
 * الاستعمال الأساسي: Groq (سريع ومجاني بلا بطاقة)، ويصلح لـ Cerebras وغيره بتغيير العنوان والنموذج.
 * لا يدعم `describeVideo` (قراءة الفيديو تبقى على Gemini).
 *
 * المخطط يُرسل داخل تعليمات النظام مع response_format=json_object (أوسع دعمًا من json_schema)،
 * والتحقق الفعلي يتم دائمًا في الـ use case قبل Domain. تنبيه خصوصية: نرسل عنوان الدرس وملاحظات المالك فقط.
 */

import type { LlmClient, LlmJsonRequest } from '@qalam/application';
import { TryNextProvider } from './fallback-llm-client.js';

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
/** نموذج Groq الافتراضي: جيد بالعربية وسريع جدًا. يُستبدل بـ GROQ_MODEL */
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

/** مهلة قصيرة: هذه الخدمات تردّ في ثوانٍ، فالتأخر الطويل يعني عطلًا فننتقل للاحتياطي */
const REQUEST_TIMEOUT_MS = 20_000;

interface ChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  error?: { message?: string };
}

/** الجزء الذي نحتاجه من fetch (يسمح بالاختبار دون شبكة) */
export type OpenAiFetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class OpenAiCompatibleLlmClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_GROQ_MODEL,
    private readonly baseUrl: string = GROQ_BASE_URL,
    /** اسم الخدمة في رسائل الخطأ */
    private readonly label: string = 'Groq',
    private readonly fetchImpl: OpenAiFetchLike = fetch as unknown as OpenAiFetchLike,
    private readonly timeoutMs: number = REQUEST_TIMEOUT_MS,
  ) {}

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    const system = `${request.system}\n\nأجب بـ JSON صالح فقط، بلا شرح ولا علامات كود، ويطابق هذا المخطط تمامًا:\n${JSON.stringify(request.schema)}`;

    let response: Awaited<ReturnType<OpenAiFetchLike>>;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: request.user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new TryNextProvider(`${this.label}: انقطع الاتصال أو انتهت المهلة`);
    }

    const body = (await response.json().catch(() => ({}))) as ChatResponse;
    if (!response.ok) {
      if (response.status === 401) throw new Error(`مفتاح ${this.label} غير صالح أو بلا صلاحية`);
      if (response.status === 403) {
        // غالبًا حجب شبكة/منطقة (VPN أو IP مرفوض) لا خطأ مفتاح: ننتقل للمزوّد التالي مع رسالة الخدمة نفسها
        throw new TryNextProvider(`رفضت خدمة ${this.label} الطلب (403)${body.error?.message ? `: ${body.error.message}` : ''}`);
      }
      // حصة/حمل/عطل: يجرّب المزوّد التالي
      if (response.status === 429 || response.status === 404 || response.status >= 500) {
        throw new TryNextProvider(`${this.label}: ${response.status}`);
      }
      const message = body.error?.message;
      throw new Error(`خطأ من خدمة ${this.label} (${response.status})${message ? `: ${message}` : ''}`);
    }

    const choice = body.choices?.[0];
    if (choice?.finish_reason === 'length') throw new Error('انقطع ردّ النموذج لطوله. اطلب عددًا أقل من الأسئلة');
    try {
      return JSON.parse(choice?.message?.content ?? '');
    } catch {
      throw new Error('ردّ النموذج ليس JSON صالحًا');
    }
  }
}
