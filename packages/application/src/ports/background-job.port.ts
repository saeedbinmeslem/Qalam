/**
 * @file background-job.port.ts
 * @description منفذ سجل العمليات الخلفية الطويلة (توليد الملاحظات والملخصات، استيراد القوائم...).
 * الصفحة تعود فورًا والعمل يكمل في الخلفية؛ هذا السجل هو ما يراه المالك ليعرف الجاري والمنتهي والفاشل.
 * التنفيذ في Infrastructure (Supabase في الإنتاج لأن الطلبات قد تصل لنسخ مختلفة من الخادم).
 */

export type BackgroundJobStatus = 'running' | 'done' | 'failed';

export interface BackgroundJob {
  id: string;
  /** مفتاح النطاق (مثل enrich:path:course) لمنع تشغيل عمليتين متطابقتين معًا */
  key: string;
  /** وصف عربي يراه المالك */
  label: string;
  status: BackgroundJobStatus;
  /** ملخص النتيجة أو سبب الفشل */
  message: string;
  startedAt: Date;
  finishedAt?: Date;
}

export interface BackgroundJobPort {
  save(job: BackgroundJob): Promise<void>;
  findById(id: string): Promise<BackgroundJob | null>;
  /** الأحدث أولًا */
  findRecent(limit: number): Promise<BackgroundJob[]>;
}
