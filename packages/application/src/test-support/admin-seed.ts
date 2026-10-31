/**
 * @file admin-seed.ts
 * @description مساعد للاختبارات فقط: مسار فيه مفهوم `c1` وكورس ووحدة جاهزة لإضافة الدروس عبر use cases الإدارة.
 * لا يُصدَّر من الحزمة.
 */
import { Concept, createConceptId, createPathId } from '@qalam/domain';
import type { AdminDeps } from '../use-cases/admin/admin-deps.js';
import { AddCourseUseCase, AddModuleUseCase, CreatePathUseCase } from '../use-cases/admin/admin-paths.usecases.js';

export async function seedPathWithModule(
  deps: AdminDeps,
  actor: { id: string; email: string },
): Promise<{ pathId: string; courseId: string; moduleId: string; conceptId: string }> {
  const { pathId } = await new CreatePathUseCase(deps).execute({
    actor,
    title: 'م',
    description: '',
    targetGoal: 'هدف',
    subject: 'ع',
  });
  await deps.concepts.save(
    new Concept({ id: createConceptId('c1'), pathId: createPathId(pathId), name: 'البيانات', description: '', level: 1 }),
  );
  const { courseId } = await new AddCourseUseCase(deps).execute({ actor, pathId, conceptId: 'c1', title: 'ك', description: '' });
  const { moduleId } = await new AddModuleUseCase(deps).execute({ actor, pathId, courseId, title: 'و', description: '' });
  return { pathId, courseId, moduleId, conceptId: 'c1' };
}
