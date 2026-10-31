/**
 * @file index.ts
 * @description نقطة التصدير الموحّدة لحزمة @qalam/application
 */

// المنافذ (Ports)
export * from './ports/path-repository.port.js';
export * from './ports/learner-repository.port.js';

// حالات الاستخدام (Use Cases)
export * from './use-cases/get-learning-path.usecase.js';
export * from './use-cases/list-learning-paths.usecase.js';
export * from './use-cases/get-lesson.usecase.js';
export * from './ports/auth.port.js';
export * from './use-cases/auth.usecases.js';
export * from './ports/event-recorder.port.js';
export * from './use-cases/record-learning-event.usecase.js';

// تقدم المتعلم
export * from './ports/event-reader.port.js';
export * from './use-cases/get-path-progress.usecase.js';

// الاختبارات القصيرة والذكاء الاصطناعي
export * from './ports/llm-client.port.js';
export * from './ports/question-repository.port.js';
export * from './use-cases/admin/generated-questions.js';
export * from './use-cases/admin/admin-quiz.usecases.js';
export * from './use-cases/admin/admin-study-guide.usecases.js';
export * from './use-cases/learner-quiz.usecases.js';
export * from './use-cases/diagnostic.usecases.js';

// لوحة التحكم الإدارية
export * from './errors.js';
export * from './ports/concept-repository.port.js';
export * from './ports/id-generator.port.js';
export * from './use-cases/admin/admin-deps.js';
export * from './use-cases/admin/admin-paths.usecases.js';
export * from './use-cases/admin/admin-lessons.usecases.js';
export * from './use-cases/admin/admin-concepts.usecases.js';
export * from './ports/playlist-catalog.port.js';
export * from './use-cases/admin/admin-playlist-import.usecases.js';
export * from './use-cases/admin/admin-path-enrichment.usecases.js';
export * from './ports/media-upload.port.js';
export * from './use-cases/admin/admin-media.usecases.js';

// أقسام المنصة: المكتبة وخريطة المفاهيم ولوحة المتعلم
export * from './use-cases/catalog.usecases.js';

// وكيل التعلّم
export * from './agent/decision-explanation.js';
export * from './agent/learning-agent.js';
export * from './use-cases/personal-plan.usecases.js';
export * from './use-cases/ask-lesson.usecase.js';
