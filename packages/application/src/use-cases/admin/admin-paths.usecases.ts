/**
 * @file admin-paths.usecases.ts
 * @description إدارة المسارات والوحدات من لوحة التحكم.
 */

import { LearningPath, Module, createModuleId, createPathId } from '@qalam/domain';
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
    await loadPath(this.deps.paths, request.pathId);
    await this.deps.paths.delete(createPathId(request.pathId));
  }
}

export class AddModuleUseCase {
  constructor(private readonly deps: AdminDeps) {}

  async execute(
    request: AdminRequest & { pathId: string; title: string; description: string },
  ): Promise<{ moduleId: string }> {
    requireAdmin(this.deps.policy, request.actor);
    const path = await loadPath(this.deps.paths, request.pathId);
    const module = new Module({
      id: createModuleId(this.deps.ids.next('mod')),
      title: request.title,
      description: request.description,
      orderIndex: path.nextModuleOrderIndex,
    });
    path.addModule(module);
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
