/**
 * @file index.ts
 * @description نقطة التصدير الموحّدة لحزمة @qalam/infrastructure
 */

// محولات التخزين (Persistence Adapters)
export * from './persistence/in-memory-path.repository.js';
export * from './persistence/in-memory-learner.repository.js';
export * from './persistence/seed-data.js';

// محولات المصادقة (Auth Adapters)
export * from './auth/supabase-auth.js';
export * from './auth/dev-cookie-auth.js';
export * from './persistence/supabase-path.repository.js';
export * from './events/event-recorders.js';
export * from './persistence/in-memory-concept.repository.js';
export * from './persistence/supabase-concept.repository.js';
export * from './persistence/random-id-generator.js';
export * from './persistence/supabase-service-client.js';
export * from './persistence/in-memory-question.repository.js';
export * from './persistence/supabase-question.repository.js';
export * from './persistence/in-memory-background-job.repository.js';
export * from './persistence/supabase-background-job.repository.js';
export * from './llm/anthropic-llm-client.js';
export * from './llm/gemini-llm-client.js';
export * from './llm/openai-compatible-llm-client.js';
export * from './llm/fallback-llm-client.js';
export * from './persistence/local-snapshot.js';
export * from './media/cloudinary-upload-signer.js';
export * from './youtube/youtube-playlist-catalog.js';
export * from './youtube/youtube-transcript-source.js';
export * from './persistence/in-memory-transcript.store.js';
export * from './persistence/supabase-transcript.store.js';
