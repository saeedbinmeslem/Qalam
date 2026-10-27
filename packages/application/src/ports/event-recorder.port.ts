/**
 * @file event-recorder.port.ts
 * @description منفذ تسجيل أحداث قياس الأثر، ومنفذ الساعة (لتثبيت الزمن في الاختبارات).
 */

import type { LearningEvent } from '@qalam/domain';

export interface EventRecorderPort {
  record(event: LearningEvent): Promise<void>;
}

export interface ClockPort {
  now(): Date;
}
