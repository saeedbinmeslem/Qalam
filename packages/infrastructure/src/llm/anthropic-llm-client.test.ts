import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { AnthropicLlmClient, unconfiguredLlmClient, type AnthropicBetaMessages } from './anthropic-llm-client.js';

function clientReturning(outcome: { stop_reason?: string | null; text?: string } | Error) {
  const calls: Array<Record<string, unknown>> = [];
  const client: AnthropicBetaMessages = {
    beta: {
      messages: {
        create: async (params) => {
          calls.push(params);
          if (outcome instanceof Error) throw outcome;
          return {
            stop_reason: outcome.stop_reason ?? 'end_turn',
            content: [
              { type: 'thinking' },
              { type: 'text', text: outcome.text ?? '' },
            ],
          };
        },
      },
    },
  };
  return { client, calls };
}

const request = { system: 'نظام', user: 'مستخدم', schema: { type: 'object' } };

describe('AnthropicLlmClient', () => {
  it('يرسل طلبًا بالمعاملات الصحيحة ويعيد JSON المحلَّل', async () => {
    const { client, calls } = clientReturning({ text: '{"questions":[]}' });
    const result = await new AnthropicLlmClient(client).generateJson(request);
    expect(result).toEqual({ questions: [] });

    const sent = calls[0]!;
    expect(sent).toMatchObject({
      model: 'claude-opus-5-5',
      system: 'نظام',
      messages: [{ role: 'user', content: 'مستخدم' }],
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: { type: 'object' } } },
    });
    // معاملات مرفوضة على هذه النماذج يجب ألا تُرسل
    for (const forbidden of ['temperature', 'top_p', 'top_k', 'tool_choice', 'thinking']) {
      expect(sent).not.toHaveProperty(forbidden);
    }
  });

  it('يستعمل النموذج المضبوط', async () => {
    const { client, calls } = clientReturning({ text: '{}' });
    await new AnthropicLlmClient(client, 'claude-sonnet-5-5').generateJson(request);
    expect(calls[0]?.model).toBe('claude-sonnet-5-5');
  });

  it('يترجم الرفض والانقطاع والـ JSON الفاسد إلى أخطاء عربية', async () => {
    await expect(new AnthropicLlmClient(clientReturning({ stop_reason: 'refusal' }).client).generateJson(request)).rejects.toThrow('رفض النموذج');
    await expect(new AnthropicLlmClient(clientReturning({ stop_reason: 'max_tokens' }).client).generateJson(request)).rejects.toThrow('انقطع');
    await expect(new AnthropicLlmClient(clientReturning({ text: 'ليس json' }).client).generateJson(request)).rejects.toThrow('JSON');
  });

  it('يترجم أخطاء SDK المطبّعة', async () => {
    const auth = new Anthropic.AuthenticationError(401, { type: 'error', error: { type: 'authentication_error', message: 'x' } }, 'x', new Headers());
    const limited = new Anthropic.RateLimitError(429, { type: 'error', error: { type: 'rate_limit_error', message: 'y' } }, 'y', new Headers());
    await expect(new AnthropicLlmClient(clientReturning(auth).client).generateJson(request)).rejects.toThrow('غير صالح');
    await expect(new AnthropicLlmClient(clientReturning(limited).client).generateJson(request)).rejects.toThrow('حد الطلبات');
  });

  it('العميل غير المضبوط يفشل برسالة واضحة', async () => {
    await expect(unconfiguredLlmClient.generateJson(request)).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
