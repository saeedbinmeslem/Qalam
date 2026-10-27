import { describe, expect, it } from 'vitest';
import { DEFAULT_GEMINI_MODEL, GeminiLlmClient, type FetchLike } from './gemini-llm-client.js';

function fetchReturning(status: number, body: unknown) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) as Record<string, unknown> });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { impl, calls };
}

const request = { system: 'نظام', user: 'مستخدم', schema: { type: 'object' } };
const answer = (text: string, finishReason = 'STOP') => ({ candidates: [{ content: { parts: [{ text }] }, finishReason }] });

describe('GeminiLlmClient', () => {
  it('يرسل الطلب بالترويسة والمعاملات الصحيحة ويعيد JSON المحلَّل', async () => {
    const { impl, calls } = fetchReturning(200, answer('{"questions":[]}'));
    const result = await new GeminiLlmClient('KEY', undefined, impl).generateJson(request);
    expect(result).toEqual({ questions: [] });

    const sent = calls[0]!;
    expect(sent.url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect(sent.url).not.toContain('KEY');
    expect(sent.headers['x-goog-api-key']).toBe('KEY');
    expect(sent.body).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'مستخدم' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const system = (sent.body['systemInstruction'] as { parts: Array<{ text: string }> }).parts[0]!.text;
    expect(system).toContain('نظام');
    expect(system).toContain('"type":"object"');
  });

  it('يستعمل النموذج المضبوط ويتجاهل أجزاء التفكير', async () => {
    const { impl, calls } = fetchReturning(200, {
      candidates: [{ content: { parts: [{ text: 'تفكير', thought: true }, { text: '{"a":1}' }] } }],
    });
    expect(await new GeminiLlmClient('K', 'gemini-x', impl).generateJson(request)).toEqual({ a: 1 });
    expect(calls[0]?.url).toContain('/models/gemini-x:generateContent');
  });

  it('يترجم الحجب والانقطاع وJSON الفاسد إلى أخطاء عربية', async () => {
    const run = (status: number, body: unknown) =>
      new GeminiLlmClient('K', undefined, fetchReturning(status, body).impl).generateJson(request);
    await expect(run(200, { promptFeedback: { blockReason: 'SAFETY' } })).rejects.toThrow('حجب Gemini هذا الطلب');
    await expect(run(200, answer('{}', 'MAX_TOKENS'))).rejects.toThrow('انقطع');
    await expect(run(200, answer('{}', 'SAFETY'))).rejects.toThrow('أسباب أمنية');
    await expect(run(200, answer('ليس json'))).rejects.toThrow('JSON');
  });

  it('يترجم أخطاء HTTP', async () => {
    const run = (status: number, message = '') =>
      new GeminiLlmClient('K', undefined, fetchReturning(status, { error: { message } }).impl).generateJson(request);
    await expect(run(429)).rejects.toThrow('حد الطلبات');
    await expect(run(400, 'API key not valid. Please pass a valid API key.')).rejects.toThrow('GEMINI_API_KEY');
    await expect(run(404)).rejects.toThrow('GEMINI_MODEL');
    await expect(run(500, 'boom')).rejects.toThrow('(500): boom');
  });

  it('يترجم فشل الشبكة', async () => {
    const failing: FetchLike = async () => {
      throw new Error('ECONNRESET');
    };
    await expect(new GeminiLlmClient('K', undefined, failing).generateJson(request)).rejects.toThrow('تعذّر الاتصال');
  });
});
