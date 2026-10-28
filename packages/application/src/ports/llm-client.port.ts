/**
 * @file llm-client.port.ts
 * @description منفذ النموذج اللغوي. التنفيذ (Claude) في Infrastructure، ولهذا المنفذ تنفيذ وهمي للاختبار.
 * الناتج «غير موثوق»: يجب أن يتحقق منه الـ use case بمخطط قبل أن يدخل Domain.
 */

export interface LlmJsonRequest {
  /** تعليمات النظام: القواعد الثابتة */
  system: string;
  /** المحتوى المتغير (مصدر الدرس) */
  user: string;
  /** JSON Schema للناتج المطلوب */
  schema: Record<string, unknown>;
}

export interface LlmVideoRequest {
  /** رابط يوتيوب العام للفيديو (يقرؤه المزوّد بنفسه؛ لا ننسخ الفيديو ولا نعيد استضافته) */
  videoUrl: string;
  startSeconds: number;
  endSeconds: number;
  instructions: string;
}

export interface LlmClient {
  /** يعيد القيمة المحللة من JSON؛ يرمي خطأ عربيًا عند الفشل أو الرفض */
  generateJson(request: LlmJsonRequest): Promise<unknown>;
  /**
   * يقرأ مقطع الفيديو ويعيد نصًا (اختياري: لا يدعمه كل مزوّد). الناتج مسودة تُراجَع بشريًا،
   * ولا يُعتمد عليه كمصدر نهائي.
   */
  describeVideo?(request: LlmVideoRequest): Promise<string>;
}
