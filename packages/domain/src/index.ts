/**
 * @file index.ts
 * @description نقطة التصدير الموحّدة لحزمة @qalam/domain
 */

// كائنات القيمة (Value Objects)
export * from './value-objects/identifiers.js';
export * from './value-objects/video-segment.js';
export * from './value-objects/mastery-state.js';

// الكيانات (Entities)
export * from './entities/concept.js';
export * from './entities/lesson.js';
export * from './entities/module.js';
export * from './entities/learning-path.js';
export * from './entities/learner.js';

// خدمات النطاق (Domain Services)
export * from './services/adaptation-rules.js';
export * from './value-objects/email.js';
export * from './value-objects/learning-event.js';
export * from './value-objects/youtube.js';
export * from './services/admin-policy.js';
export * from './services/concept-graph.js';
export * from './services/path-progress.js';
export * from './entities/quiz-question.js';
export * from './services/quiz-grading.js';
