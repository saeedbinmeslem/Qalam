/**
 * @file index.ts
 * @description نقطة التصدير الموحّدة لحزمة @qalam/application
 */

// المنافذ (Ports)
export * from './ports/path-repository.port.js';
export * from './ports/learner-repository.port.js';

// حالات الاستخدام (Use Cases)
export * from './use-cases/get-learning-path.usecase.js';
