/**
 * @file id-generator.port.ts
 * @description منفذ توليد المعرّفات، ليبقى Application نقيًا وقابلًا للاختبار بمعرّفات متوقعة.
 */
export interface IdGeneratorPort {
  /** معرّف فريد نصي ببادئة دالّة، مثل path-3f9a2c1d */
  next(prefix: string): string;
}
