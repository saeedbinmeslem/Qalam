/**
 * @file admin-paths.usecases.ts
 * @description إدارة المسارات والكورسات والوحدات من لوحة التحكم.
 */

import {
  Course,
  LearningPath,
  Module,
  createConceptId,
  createCourseId,
  createModuleId,
  createPathId,
} from '@qalam/domain';
import { NotFoundError } from '../../errors.js';
import { requireAdmin, loadPath, type AdminDeps, type AdminRequest } from './admin-deps.js';

interface PathDetails {
  title: string;
  description: string;
  targetGoal: string;
  subject: string;
}

/** هل المستخدم مدير؟ (تستعمله الواجهة لإظهار اللوحة أو رفضها) */
export class CheckAdminUseCase {
  constructor(private readonly deps: AdminDeps) {}

  execute(request: AdminRequest): boolean {
    return request.actor !== null && this.deps.policy.isAdmin(request.actor.email);
  }
}

export class CreatePathUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & PathDetails): Promise<{ pathId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = new LearningPath({
      id: createPathId(this.deps.ids.next('path')),
      title: request.title,
      description: request.description,
      targetGoal: request.targetGoal,
      subject: request.subject,
    });
    await this.deps.paths.save(path);
    return { pathId: path.id };
  }
}

export class UpdatePathUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & PathDetails & { pathId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    await this.deps.paths.save(path.updateDetails(request));
  }
}

export class DeletePathUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & { pathId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    await this.deps.paths.delete(path.id);
    // مفاهيم المسار تذهب معه (في Postgres تحذفها السلسلة، وهذا يكفل المخازن الأخرى)
    for (const concept of await this.deps.concepts.findByPath(path.id)) await this.deps.concepts.delete(concept.id);
  }
}

export class AddModuleUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; courseId: string; title: string; description: string },
  ): Promise<{ moduleId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const course = path.findCourse(createCourseId(request.courseId));
    if (!course) throw new NotFoundError('الكورس');
    const module = new Module({
      id: createModuleId(this.deps.ids.next('mod')),
      title: request.title,
      description: request.description,
      orderIndex: course.nextModuleOrderIndex,
    });
    course.addModule(module);
    await this.deps.paths.save(path);
    return { moduleId: module.id };
  }
}

export class UpdateModuleUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; moduleId: string; title: string; description: string },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const module = path.findModule(createModuleId(request.moduleId));
    if (!module) throw new NotFoundError('الوحدة');
    path.replaceModule(module.updateDetails(request));
    await this.deps.paths.save(path);
  }
}

export class DeleteModuleUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; moduleId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    path.removeModule(createModuleId(request.moduleId));
    await this.deps.paths.save(path);
  }
}

export class MoveModuleUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; moduleId: string; direction: 'up' | 'down' },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    path.moveModule(createModuleId(request.moduleId), request.direction);
    await this.deps.paths.save(path);
  }
}

interface CourseDetails {
  title: string;
  description: string;
}

/** كورس جديد داخل مفهوم من مفاهيم المسار نفسه */
export class AddCourseUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & CourseDetails & { pathId: string; conceptId: string },
  ): Promise<{ courseId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const conceptId = createConceptId(request.conceptId);
    const concept = await this.deps.concepts.findById(conceptId);
    if (!concept || concept.pathId !== path.id) throw new NotFoundError('المفهوم');
    const course = new Course({
      id: createCourseId(this.deps.ids.next('course')),
      conceptId,
      title: request.title,
      description: request.description,
      orderIndex: path.nextCourseOrderIndex,
    });
    path.addCourse(course);
    await this.deps.paths.save(path);
    return { courseId: course.id };
  }
}

export class UpdateCourseUseCase {
  constructor(private readonly deps: AdminDeps) {}

  /** يغيّر العنوان والوصف، وينقل الكورس إلى مفهوم آخر في المسار إن أُعطي conceptId */
  async execute(
    request: AdminRequest & CourseDetails & { pathId: string; courseId: string; conceptId?: string },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const course = path.findCourse(createCourseId(request.courseId));
    if (!course) throw new NotFoundError('الكورس');
    let conceptId = course.conceptId;
    if (request.conceptId && request.conceptId !== course.conceptId) {
      const concept = await this.deps.concepts.findById(createConceptId(request.conceptId));
      if (!concept || concept.pathId !== path.id) throw new NotFoundError('المفهوم');
      conceptId = concept.id;
    }
    path.replaceCourse(course.updateDetails({ title: request.title, description: request.description, conceptId }));
    await this.deps.paths.save(path);
  }
}

export class DeleteCourseUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(request: AdminRequest & { pathId: string; courseId: string }): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    path.removeCourse(createCourseId(request.courseId));
    await this.deps.paths.save(path);
  }
}

export class MoveCourseUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; courseId: string; direction: 'up' | 'down' },
  ): Promise<void> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    path.moveCourse(createCourseId(request.courseId), request.direction);
    await this.deps.paths.save(path);
  }
}
