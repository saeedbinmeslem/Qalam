import { describe, expect, it, vi } from 'vitest';
import { FallbackLlmClient, TryNextProvider } from './fallback-llm-client.js';
import { OpenAiCompatibleLlmClient, type OpenAiFetchLike } from './openai-compatible-llm-client.js';

function fetchOnce(status: number, body: unknown | Error) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const impl: OpenAiFetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) as Record<string, unknown> });
    if (body instanceof Error) throw body;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { impl, calls };
}

const request = { system: 'نظام', user: 'مستخدم', schema: { type: 'object' } };
const answer = (content: string, finish_reason = 'stop') => ({ choices: [{ message: { content }, finish_reason }] });
const make = (impl: OpenAiFetchLike) => new OpenAiCompatibleLlmClient('KEY', 'm', 'https://x.test/v1', 'Groq', impl);

describe('OpenAiCompatibleLlmClient', () => {
  it('يرسل الطلب بترويسة Bearer ويعيد JSON المحلَّل', async () => {
    const { impl, calls } = fetchOnce(200, answer('{"a":1}'));
    expect(await make(impl).generateJson(request)).toEqual({ a: 1 });
    const sent = calls[0]!;
    expect(sent.url).toBe('https://x.test/v1/chat/completions');
    expect(sent.headers['authorization']).toBe('Bearer KEY');
    expect(sent.body).toMatchObject({ model: 'm', response_format: { type: 'json_object' } });
    const messages = sent.body['messages'] as Array<{ role: string; content: string }>;
    expect(messages[0]!.content).toContain('"type":"object"');
    expect(messages[1]).toEqual({ role: 'user', content: 'مستخدم' });
  });

  it('يترجم الأخطاء: مفتاح، حمل مؤقت، قطع، JSON فاسد', async () => {
    await expect(make(fetchOnce(401, {}).impl).generateJson(request)).rejects.toThrow('مفتاح Groq');
    await expect(make(fetchOnce(403, { error: { message: 'Access denied. Please check your network settings.' } }).impl).generateJson(request)).rejects.toSatisfy((e: unknown) => e instanceof TryNextProvider && e.message.includes('(403): Access denied'));
    await expect(make(fetchOnce(429, {}).impl).generateJson(request)).rejects.toBeInstanceOf(TryNextProvider);
    await expect(make(fetchOnce(500, new Error('x')).impl).generateJson(request)).rejects.toBeInstanceOf(TryNextProvider);
    await expect(make(fetchOnce(200, answer('{}', 'length')).impl).generateJson(request)).rejects.toThrow('انقطع');
    await expect(make(fetchOnce(200, answer('ليس json')).impl).generateJson(request)).rejects.toThrow('JSON');
    await expect(make(fetchOnce(400, { error: { message: 'bad' } }).impl).generateJson(request)).rejects.toThrow('(400): bad');
  });
});

describe('FallbackLlmClient', () => {
  const failing = { generateJson: async () => { throw new TryNextProvider('429'); } };
  const good = { generateJson: async () => ({ ok: true }) };

  it('ينتقل للمزوّد التالي عند عطل مؤقت فقط', async () => {
    expect(await new FallbackLlmClient([failing, good]).generateJson(request)).toEqual({ ok: true });
    const badKey = { generateJson: async () => { throw new Error('مفتاح غير صالح'); } };
    await expect(new FallbackLlmClient([badKey, good]).generateJson(request)).rejects.toThrow('مفتاح غير صالح');
  });

  it('يسجّل اسم المزوّد والزمن', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m: string) => void lines.push(m));
    await new FallbackLlmClient([failing, good]).generateJson(request);
    spy.mockRestore();
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^\[llm\] Object فشل بعد \d+ms: 429/);
    expect(lines[1]).toMatch(/^\[llm\] Object نجح في \d+ms/);
  });

  it('يفشل برسالة واضحة إن تعذّر الجميع', async () => {
    await expect(new FallbackLlmClient([failing, failing]).generateJson(request)).rejects.toThrow('تعذّر الوصول');
  });

  it('describeVideo يذهب لأول مزوّد يدعمه', async () => {
    const video = { generateJson: async () => ({}), describeVideo: async () => 'نص' };
    const text = await new FallbackLlmClient([good, video]).describeVideo({
      videoUrl: 'u', startSeconds: 0, endSeconds: 1, instructions: 'i',
    });
    expect(text).toBe('نص');
  });
});
