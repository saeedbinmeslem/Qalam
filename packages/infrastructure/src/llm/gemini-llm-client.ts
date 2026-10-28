/**
 * @file gemini-llm-client.ts
 * @description محوّل منفذ LlmClient على Gemini API (مفتاح مجاني من Google AI Studio يكفي للبدء).
 * نستعمل REST `generateContent` مباشرة (لا حزمة إضافية). تنبيه خصوصية: في الفئة المجانية تقول
 * Google إن المحتوى يُستعمل لتحسين منتجاتها، لذلك لا نرسل إلا عنوان الدرس وملاحظات المالك، لا بيانات متعلمين.
 *
 * المتانة: نماذج Flash المجانية تتعرض لأحمال عالية (503) ويتغير توفرها، فنجرّب قائمة نماذج بالترتيب
 * وننتقل للتالي عند 503/429/404/مهلة، ونتوقف فورًا عند خطأ المفتاح أو الحجب الأمني.
 *
 * المخطط يُرسل داخل تعليمات النظام مع responseMimeType=application/json بدل responseSchema،
 * لتجنب اختلاف صيغة المخطط بين الإصدارات؛ والتحقق الفعلي يتم دائمًا في الـ use case قبل Domain.
 */

import type { LlmClient, LlmJsonRequest, LlmVideoRequest } from '@qalam/application';

/** النماذج بالترتيب (جُرّبت فعليًا بمفتاح مجاني). تُستبدل بـ GEMINI_MODEL (قائمة مفصولة بفواصل). */
export const DEFAULT_GEMINI_MODELS: readonly string[] = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
export const DEFAULT_GEMINI_MODEL = DEFAULT_GEMINI_MODELS[0] as string;

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 45_000;
const VIDEO_TIMEOUT_MS = 120_000;

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

/** الجزء الذي نحتاجه من fetch (يسمح بالاختبار دون شبكة) */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** أخطاء تستحق تجربة النموذج التالي (حمل/حصة/غير متاح/مهلة) */
class TryNextModel extends Error {}

export class GeminiLlmClient implements LlmClient {
  private readonly models: readonly string[];

  constructor(
    private readonly apiKey: string,
    /** نموذج واحد أو قائمة نماذج بالترتيب */
    models: string | readonly string[] = DEFAULT_GEMINI_MODELS,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {
    this.models = (typeof models === 'string' ? models.split(',') : [...models]).map((m) => m.trim()).filter(Boolean);
    if (this.models.length === 0) this.models = DEFAULT_GEMINI_MODELS;
  }

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    const system = `${request.system}\n\nأجب بـ JSON صالح فقط، بلا شرح ولا علامات كود، ويطابق هذا المخطط تمامًا:\n${JSON.stringify(request.schema)}`;
    const text = await this.withFallback({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('ردّ النموذج ليس JSON صالحًا');
    }
  }

  /** قراءة مقطع من فيديو يوتيوب عام عبر رابطه (مهلة أطول لأن معالجة الفيديو أبطأ) */
  async describeVideo(request: LlmVideoRequest): Promise<string> {
    return this.withFallback(
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                file_data: { file_uri: request.videoUrl },
                video_metadata: { start_offset: `${request.startSeconds}s`, end_offset: `${request.endSeconds}s` },
              },
              { text: request.instructions },
            ],
          },
        ],
      },
      VIDEO_TIMEOUT_MS,
    );
  }

  /** يجرّب النماذج بالترتيب ويعيد نص أول ردّ ناجح */
  private async withFallback(body: Record<string, unknown>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<string> {
    let lastError: Error | undefined;
    for (const model of this.models) {
      try {
        return await this.callModel(model, body, timeoutMs);
      } catch (error) {
        if (!(error instanceof TryNextModel)) throw error;
        lastError = error;
      }
    }
    throw new Error(`تعذّر الوصول إلى نماذج Gemini حاليًا (ضغط مؤقت على الخدمة). أعد المحاولة بعد دقيقة. التفصيل: ${lastError?.message ?? ''}`);
  }

  private async callModel(model: string, requestBody: Record<string, unknown>, timeoutMs: number): Promise<string> {
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        // المفتاح في ترويسة لا في الرابط، فلا يظهر في السجلات
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new TryNextModel(`${model}: انقطع الاتصال أو انتهت المهلة`);
    }

    const body = (await response.json().catch(() => ({}))) as GeminiResponse;
    if (!response.ok) throw translateHttpError(model, response.status, body);

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
    return (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('');
  }
}

function translateHttpError(model: string, status: number, body: GeminiResponse): Error {
  const message = body.error?.message ?? '';
  if ((status === 400 || status === 401 || status === 403) && /api key|permission|credential/i.test(message)) {
    return new Error('مفتاح Gemini (GEMINI_API_KEY) غير صالح أو بلا صلاحية');
  }
  // حمل مؤقت أو حصة النموذج أو نموذج غير متاح لهذا الحساب: ننتقل للتالي
  if (status === 429 || status === 404 || status >= 500) return new TryNextModel(`${model}: ${status}`);
  return new Error(`خطأ من خدمة Gemini (${status})${message ? `: ${message}` : ''}`);
}
