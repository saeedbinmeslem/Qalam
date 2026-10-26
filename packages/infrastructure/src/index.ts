/**
 * @file index.ts
 * @description نقطة التصدير الموحّدة لحزمة @qalam/infrastructure
 */

// محولات التخزين (Persistence Adapters)
export * from './persistence/in-memory-path.repository.js';
export * from './persistence/in-memory-learner.repository.js';
export * from './persistence/seed-data.js';
