/**
 * @file admin-deps.ts
 * @description التبعيات المشتركة لحالات استخدام لوحة التحكم + حارس الصلاحية.
 * كل use case إداري يستدعي requireAdmin أولًا، فلا تعتمد الحماية على الواجهة وحدها.
 */

import { AdminPolicy, LearningPath, createPathId, type LessonId } from '@qalam/domain';
import { ForbiddenError, NotFoundError, UnauthenticatedError } from '../../errors.js';
import type { AuthUser } from '../../ports/auth.port.js';
import type { ConceptRepositoryPort } from '../../ports/concept-repository.port.js';
import type { IdGeneratorPort } from '../../ports/id-generator.port.js';
import type { PathRepositoryPort } from '../../ports/path-repository.port.js';

export interface AdminDeps {
  paths: PathRepositoryPort;
  concepts: ConceptRepositoryPort;
  ids: IdGeneratorPort;
  policy: AdminPolicy;
}

/** كل طلب إداري يحمل المستخدم الحالي ليُفحص */
export interface AdminRequest {
  actor: AuthUser | null;
}

export function requireAdmin(policy: AdminPolicy, actor: AuthUser | null): void {
  if (!actor) throw new UnauthenticatedError();
  if (!policy.isAdmin(actor.email)) throw new ForbiddenError();
}

export async function loadPath(paths: PathRepositoryPort, pathId: string): Promise<LearningPath> {
  const path = await paths.findById(createPathId(pathId));
  if (!path) throw new NotFoundError('المسار');
  return path;
}

/** يحفظ درسًا واحدًا إن دعم المستودع ذلك (سريع)، وإلا يحفظ المسار كله */
export async function persistLesson(paths: PathRepositoryPort, path: LearningPath, lessonId: LessonId): Promise<void> {
  if (paths.saveLesson) await paths.saveLesson(path, lessonId);
  else await paths.save(path);
}
