/**
 * @file event-reader.port.ts
 * @description منفذ قراءة أحداث المتعلم (لحساب التقدم والتكيّف). منفصل عن التسجيل (مبدأ فصل الواجهات).
 */

import type { LearningEvent, LearningEventType } from '@qalam/domain';

export interface EventReaderPort {
  /** أحداث المستخدم، ويمكن حصرها بأنواع محددة */
  listByUser(userId: string, types?: readonly LearningEventType[]): Promise<LearningEvent[]>;
}
