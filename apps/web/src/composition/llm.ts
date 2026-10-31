/**
 * @file llm.ts
 * @description يربط منفذ LlmClient بمزوّد الذكاء الاصطناعي حسب المفاتيح المتوفرة:
 * 1) LLM_PROVIDER صريح (groq | gemini | anthropic)، وإلا
 * 2) سلسلة مجانية: GROQ_API_KEY (الأسرع) ثم GEMINI_API_KEY احتياطيًا، وإلا ANTHROPIC_API_KEY، وإلا
 * 3) عميل غير مضبوط يفشل برسالة واضحة فتعمل بقية المنصة.
 * النموذج اختياري: GEMINI_MODEL / ANTHROPIC_MODEL.
 */
import type { LlmClient } from '@qalam/application';
import {
  FallbackLlmClient,
  GeminiLlmClient,
  OPENROUTER_BASE_URL,
  OpenAiCompatibleLlmClient,
  createAnthropicLlmClient,
  unconfiguredLlmClient,
} from '@qalam/infrastructure';

/** نماذج Gemini للأسئلة التفاعلية: الأخف أولًا لأن السرعة هنا أهم من العمق */
const FAST_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
/** موجّه OpenRouter المجاني: يختار نموذجًا مجانيًا متاحًا لكل طلب، فلا نتأثر بتغيّر أسماء النسخ (يُستبدل بـ OPENROUTER_MODEL) */
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

export function getLlmClient(options: { fast?: boolean } = {}): LlmClient {
  const groq = process.env.GROQ_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const provider = process.env.LLM_PROVIDER || (groq || gemini || openrouter ? 'free' : anthropic ? 'anthropic' : '');

  // المزوّدون المجانيون في سلسلة: Groq (الأسرع) ثم Gemini (ولقراءة الفيديو) ثم OpenRouter احتياطيًا أخيرًا
  // GEMINI_MODEL قائمة اختيارية مفصولة بفواصل؛ بدونها تُستعمل قائمة النماذج الافتراضية مع الانتقال عند الضغط
  const chain: LlmClient[] = [];
  if ((provider === 'free' || provider === 'groq') && groq) {
    chain.push(new OpenAiCompatibleLlmClient(groq, process.env.GROQ_MODEL || undefined));
  }
  if ((provider === 'free' || provider === 'gemini') && gemini) {
    const models = process.env.GEMINI_MODEL || (options.fast ? FAST_GEMINI_MODELS : undefined);
    // في الوضع السريع مهلة 15ث لكل نموذج فيبقى وقت للمزوّد التالي
    chain.push(new GeminiLlmClient(gemini, models, undefined, options.fast ? 15_000 : undefined));
  }
  if ((provider === 'free' || provider === 'openrouter') && openrouter) {
    chain.push(
      new OpenAiCompatibleLlmClient(
        openrouter,
        process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
        OPENROUTER_BASE_URL,
        'OpenRouter',
        undefined,
        // النسخ المجانية أبطأ: مهلة أطول
        30_000,
      ),
    );
  }
  if (chain.length === 1) return chain[0] as LlmClient;
  if (chain.length > 1) return new FallbackLlmClient(chain);
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

/**
 * عميل لخطوات الخطة: بالمهلة المطلوبة. اختيار المسار ينتظره المتعلم (40ث)، وصياغة عناوين الأسابيع تجري
 * في الخلفية فتتحمل أكثر (100ث) لأن Gemini المجاني قد يستغرق دقيقة.
 */
export function getPlanLlmClient(timeoutMs = 40000, options: { fast?: boolean } = {}): LlmClient | undefined {
  const client = getLlmClient(options);
  if (client === unconfiguredLlmClient) return undefined;
  return {
    generateJson: (request) =>
      Promise.race([
        client.generateJson(request),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة النموذج')), timeoutMs)),
      ]),
  };
}
