/**
 * @file random-id-generator.ts
 * @description مولّد معرّفات عشوائية قصيرة ببادئة دالّة (path-3f9a2c1d).
 */

import { randomUUID } from 'node:crypto';
import type { IdGeneratorPort } from '@qalam/application';

export const randomIdGenerator: IdGeneratorPort = {
  next: (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`,
};
