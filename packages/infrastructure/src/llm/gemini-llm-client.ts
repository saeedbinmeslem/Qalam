/**
 * @file gemini-llm-client.ts
 * @description محوّل منفذ LlmClient على Gemini API (مفتاح مجاني من Google AI Studio يكفي للبدء).
 * نستعمل REST `generateContent` مباشرة (لا حزمة إضافية). تنبيه خصوصية: في الفئة المجانية تقول
 * Google إن المحتوى يُستعمل لتحسين منتجاتها، لذلك لا نرسل إلا عنوان الدرس وملاحظات المالك، لا بيانات متعلمين.
 *
 * المخطط يُرسل داخل تعليمات النظام مع responseMimeType=application/json بدل responseSchema،
 * لتجنب اختلاف صيغة المخطط بين الإصدارات؛ والتحقق الفعلي يتم دائمًا في الـ use case قبل Domain.
 */

import type { LlmClient, LlmJsonRequest } from '@qalam/application';

/** النموذج الموصى به في وثائق Gemini للمشاريع الجديدة (قابل للتغيير بـ GEMINI_MODEL) */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

/** الجزء الذي نحتاجه من fetch (يسمح بالاختبار دون شبكة) */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class GeminiLlmClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_GEMINI_MODEL,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {}

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    const system = `${request.system}\n\nأجب بـ JSON صالح فقط، بلا شرح ولا علامات كود، ويطابق هذا المخطط تمامًا:\n${JSON.stringify(request.schema)}`;

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(`${ENDPOINT}/${this.model}:generateContent`, {
        method: 'POST',
        // المفتاح في ترويسة لا في الرابط، فلا يظهر في السجلات
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: request.user }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
    } catch {
      throw new Error('تعذّر الاتصال بخدمة Gemini');
    }

    const body = (await response.json().catch(() => ({}))) as GeminiResponse;
    if (!response.ok) throw translateHttpError(response.status, body);

    if (body.promptFeedback?.blockReason) {
      throw new Error('حجب Gemini هذا الطلب. عدّل ملاحظات الدرس وأعد المحاولة');
    }
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('انقطع ردّ النموذج لطوله. اطلب عددًا أقل من الأسئلة');
    }
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
      throw new Error('حجب Gemini الردّ لأسباب أمنية. عدّل ملاحظات الدرس وأعد المحاولة');
    }

    // نتجاهل أجزاء «التفكير» ونجمع النص فقط
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('ردّ النموذج ليس JSON صالحًا');
    }
  }
}

function translateHttpError(status: number, body: GeminiResponse): Error {
  const message = body.error?.message ?? '';
  if (status === 429) return new Error('تجاوزنا حد الطلبات المجاني في Gemini. أعد المحاولة بعد دقيقة');
  if ((status === 400 || status === 401 || status === 403) && /api key|permission|credential/i.test(message)) {
    return new Error('مفتاح Gemini (GEMINI_API_KEY) غير صالح أو بلا صلاحية');
  }
  if (status === 404) return new Error('نموذج Gemini غير موجود: راجع GEMINI_MODEL');
  return new Error(`خطأ من خدمة Gemini (${status})${message ? `: ${message}` : ''}`);
}
