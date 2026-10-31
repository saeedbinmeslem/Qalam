import { describe, expect, it } from 'vitest';
import { DEFAULT_GEMINI_MODELS, GeminiLlmClient, type FetchLike } from './gemini-llm-client.js';

type Outcome = { status: number; body: unknown } | Error;

/** يرد على كل استدعاء بالنتيجة التالية في القائمة (واحدة لكل نموذج جُرّب) */
function fetchSequence(outcomes: Outcome[]) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown>; hasSignal: boolean }> = [];
  let i = 0;
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) as Record<string, unknown>, hasSignal: !!init.signal });
    const outcome = outcomes[Math.min(i++, outcomes.length - 1)]!;
    if (outcome instanceof Error) throw outcome;
    return { ok: outcome.status >= 200 && outcome.status < 300, status: outcome.status, json: async () => outcome.body };
  };
  return { impl, calls };
}

const request = { system: 'نظام', user: 'مستخدم', schema: { type: 'object' } };
const answer = (text: string, finishReason = 'STOP') => ({ candidates: [{ content: { parts: [{ text }] }, finishReason }] });
const ok = (text: string): Outcome => ({ status: 200, body: answer(text) });
const unavailable: Outcome = { status: 503, body: { error: { message: 'high demand' } } };

describe('GeminiLlmClient', () => {
  it('يرسل الطلب بالترويسة والمعاملات الصحيحة ويعيد JSON المحلَّل', async () => {
    const { impl, calls } = fetchSequence([ok('{"questions":[]}')]);
    const result = await new GeminiLlmClient('KEY', undefined, impl).generateJson(request);
    expect(result).toEqual({ questions: [] });

    const sent = calls[0]!;
    expect(sent.url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODELS[0]}:generateContent`);
    expect(sent.url).not.toContain('KEY');
    expect(sent.headers['x-goog-api-key']).toBe('KEY');
    expect(sent.hasSignal).toBe(true);
    expect(sent.body).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'مستخدم' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const system = (sent.body['systemInstruction'] as { parts: Array<{ text: string }> }).parts[0]!.text;
    expect(system).toContain('نظام');
    expect(system).toContain('"type":"object"');
  });

  it('يعيد الطلب مرة واحدة عند JSON تالف، ويفشل برسالة واضحة إن تكرر', async () => {
    const recovered = fetchSequence([ok('{"a":'), ok('{"a":1}')]);
    expect(await new GeminiLlmClient('K', 'm1', recovered.impl).generateJson(request)).toEqual({ a: 1 });
    expect(recovered.calls).toHaveLength(2);

    const broken = fetchSequence([ok('{"a":')]);
    await expect(new GeminiLlmClient('K', 'm1', broken.impl).generateJson(request)).rejects.toThrow('ليس JSON صالحًا');
    expect(broken.calls).toHaveLength(2);
  });

  it('ينتقل إلى النموذج التالي عند 503 أو 429 أو 404 أو انقطاع الشبكة', async () => {
    const { impl, calls } = fetchSequence([unavailable, { status: 429, body: {} }, new Error('ECONNRESET'), ok('{"a":1}')]);
    const client = new GeminiLlmClient('K', ['m1', 'm2', 'm3', 'm4'], impl);
    expect(await client.generateJson(request)).toEqual({ a: 1 });
    expect(calls.map((c) => c.url.match(/models\/([^:]+):/)![1])).toEqual(['m1', 'm2', 'm3', 'm4']);

    const notFound = fetchSequence([{ status: 404, body: {} }, ok('{"b":2}')]);
    expect(await new GeminiLlmClient('K', 'x,y', notFound.impl).generateJson(request)).toEqual({ b: 2 });
  });

  it('يفشل برسالة واضحة عند تعذّر كل النماذج', async () => {
    const { impl, calls } = fetchSequence([unavailable]);
    await expect(new GeminiLlmClient('K', ['m1', 'm2'], impl).generateJson(request)).rejects.toThrow('ضغط مؤقت');
    expect(calls).toHaveLength(2);
  });

  it('يتوقف فورًا عند خطأ المفتاح أو الحجب دون تجربة بقية النماذج', async () => {
    const badKey = fetchSequence([{ status: 400, body: { error: { message: 'API key not valid. Please pass a valid API key.' } } }]);
    await expect(new GeminiLlmClient('K', ['m1', 'm2'], badKey.impl).generateJson(request)).rejects.toThrow('GEMINI_API_KEY');
    expect(badKey.calls).toHaveLength(1);

    const blocked = fetchSequence([{ status: 200, body: { promptFeedback: { blockReason: 'SAFETY' } } }]);
    await expect(new GeminiLlmClient('K', ['m1', 'm2'], blocked.impl).generateJson(request)).rejects.toThrow('حجب Gemini هذا الطلب');
    expect(blocked.calls).toHaveLength(1);
  });

  it('يعطّل التفكير، ويعيد المحاولة بدونه إن رفضه النموذج', async () => {
    const { impl, calls } = fetchSequence([
      { status: 400, body: { error: { message: 'Thinking budget 0 is invalid for this model' } } },
      ok('{"a":1}'),
    ]);
    expect(await new GeminiLlmClient('K', 'm1', impl).generateJson(request)).toEqual({ a: 1 });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.body['generationConfig']).toMatchObject({ thinkingConfig: { thinkingBudget: 0 } });
    expect(calls[1]!.body['generationConfig']).toEqual({ responseMimeType: 'application/json' });
  });

  it('يتجاهل أجزاء التفكير ويقبل قائمة مفصولة بفواصل', async () => {
    const { impl, calls } = fetchSequence([
      { status: 200, body: { candidates: [{ content: { parts: [{ text: 'تفكير', thought: true }, { text: '{"a":1}' }] } }] } },
    ]);
    expect(await new GeminiLlmClient('K', ' gemini-x , gemini-y ', impl).generateJson(request)).toEqual({ a: 1 });
    expect(calls[0]?.url).toContain('/models/gemini-x:generateContent');
  });

  it('describeVideo يرسل رابط الفيديو ونطاق المقطع ويعيد النص', async () => {
    const { impl, calls } = fetchSequence([unavailable, { status: 200, body: answer('نقاط الملاحظات') }]);
    const text = await new GeminiLlmClient('K', ['m1', 'm2'], impl).describeVideo({
      videoUrl: 'https://www.youtube.com/watch?v=abc',
      startSeconds: 10,
      endSeconds: 70,
      instructions: 'لخّص',
    });
    expect(text).toBe('نقاط الملاحظات');
    expect(calls).toHaveLength(2);
    expect(calls[1]?.body).toMatchObject({
      contents: [
        {
          parts: [
            { file_data: { file_uri: 'https://www.youtube.com/watch?v=abc' }, video_metadata: { start_offset: '10s', end_offset: '70s' } },
            { text: 'لخّص' },
          ],
        },
      ],
    });
  });

  it('describeVideo يخفّف الطلب (لقطة كل ثانيتين بدقة منخفضة) ويعيده بدون ما رفضه النموذج', async () => {
    const { impl, calls } = fetchSequence([
      { status: 400, body: { error: { message: 'Unsupported field: media resolution and fps' } } },
      { status: 200, body: answer('نقاط') },
    ]);
    const text = await new GeminiLlmClient('K', ['m1'], impl).describeVideo({
      videoUrl: 'https://www.youtube.com/watch?v=abc', startSeconds: 0, endSeconds: 60, instructions: 'لخّص',
    });
    expect(text).toBe('نقاط');
    const first = JSON.stringify(calls[0]?.body);
    const second = JSON.stringify(calls[1]?.body);
    expect(first).toContain('MEDIA_RESOLUTION_LOW');
    expect(first).toContain('"fps":0.5');
    expect(second).not.toContain('MEDIA_RESOLUTION_LOW');
    expect(second).not.toContain('fps');
    expect(calls).toHaveLength(2);
  });

  it('يترجم الانقطاع وJSON الفاسد والأخطاء الأخرى', async () => {
    const run = (o: Outcome) => new GeminiLlmClient('K', 'm', fetchSequence([o]).impl).generateJson(request);
    await expect(run({ status: 200, body: answer('{}', 'MAX_TOKENS') })).rejects.toThrow('انقطع');
    await expect(run({ status: 200, body: answer('{}', 'SAFETY') })).rejects.toThrow('أسباب أمنية');
    await expect(run(ok('ليس json'))).rejects.toThrow('JSON');
    await expect(run({ status: 400, body: { error: { message: 'bad field' } } })).rejects.toThrow('(400): bad field');
  });
});
