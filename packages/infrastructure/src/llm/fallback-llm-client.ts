/**
 * @file fallback-llm-client.ts
 * @description يجمع عدة مزوّدين LlmClient في سلسلة: يجرّب الأول (الأسرع)، وعند عطل مؤقت
 * (حصة/حمل/مهلة، أي TryNextProvider) ينتقل للتالي. أخطاء المفتاح والحجب والرد الفاسد لا تُجرَّب على غيره.
 * قراءة الفيديو (describeVideo) تذهب لأول مزوّد يدعمها.
 */

import type { LlmClient, LlmJsonRequest, LlmVideoRequest } from '@qalam/application';

/** خطأ مؤقت يستحق تجربة المزوّد التالي */
export class TryNextProvider extends Error {}

export class FallbackLlmClient implements LlmClient {
  constructor(private readonly providers: readonly LlmClient[]) {
    if (providers.length === 0) throw new Error('FallbackLlmClient يحتاج مزوّدًا واحدًا على الأقل');
  }

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    let lastError: Error | undefined;
    for (const provider of this.providers) {
      const name = provider.constructor.name;
      const started = Date.now();
      try {
        const result = await provider.generateJson(request);
        console.log(`[llm] ${name} نجح في ${Date.now() - started}ms`);
        return result;
      } catch (error) {
        console.log(`[llm] ${name} فشل بعد ${Date.now() - started}ms: ${error instanceof Error ? error.message : String(error)}`);
        // أخطاء غير مؤقتة تُرمى فورًا؛ وGemini يرمي خطأ عربيًا عاديًا بعد استنفاد نماذجه فنعامله كمؤقت أيضًا
        if (error instanceof TryNextProvider || isGeminiExhausted(error)) {
          lastError = error as Error;
          continue;
        }
        throw error;
      }
    }
    throw new Error(`تعذّر الوصول إلى خدمات الذكاء الاصطناعي حاليًا. أعد المحاولة بعد دقيقة. التفصيل: ${lastError?.message ?? ''}`);
  }

  async describeVideo(request: LlmVideoRequest): Promise<string> {
    const provider = this.providers.find((p) => p.describeVideo);
    if (!provider?.describeVideo) throw new Error('قراءة الفيديو غير مدعومة في المزوّد الحالي');
    return provider.describeVideo(request);
  }
}

function isGeminiExhausted(error: unknown): boolean {
  return error instanceof Error && error.message.includes('ضغط مؤقت على الخدمة');
}
