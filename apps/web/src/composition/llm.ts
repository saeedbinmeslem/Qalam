/**
 * @file llm.ts
 * @description يربط منفذ LlmClient بـ Claude عند توفر ANTHROPIC_API_KEY، وإلا ينبّه بوضوح.
 * ANTHROPIC_MODEL اختياري (الافتراضي في المحوّل).
 */
import { createAnthropicLlmClient, unconfiguredLlmClient } from '@qalam/infrastructure';
import type { LlmClient } from '@qalam/application';

export function getLlmClient(): LlmClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? createAnthropicLlmClient(apiKey, process.env.ANTHROPIC_MODEL || undefined) : unconfiguredLlmClient;
}
