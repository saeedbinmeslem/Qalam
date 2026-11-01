/**
 * @file list-learning-paths.usecase.ts
 * @description حالة استخدام عرض المسارات المتاحة (ملخصات خفيفة للصفحة الرئيسية).
 */

import type { PathId } from '@qalam/domain';
import type { PathRepositoryPort } from '../ports/path-repository.port.js';

export interface LearningPathSummary {
  id: PathId;
  title: string;
  description: string;
  subject: string;
  modulesCount: number;
  lessonsCount: number;
  /** عدد الدروس التي اعتمدها المالك بعد مراجعتها (يعرضه لوحة التحكم) */
  reviewedLessonsCount: number;
  totalDurationSeconds: number;
  /** معرّف فيديو يوتيوب لأول درس يملك واحدًا، يُستعمل مصغّرته غلافًا للمسار؛ غائب إن كانت الدروس مرفوعة */
  coverVideoId?: string;
  /** صورة الغلاف المرفوعة للمسار إن وُجدت */
  coverUrl?: string;
}

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export class ListLearningPathsUseCase {
  constructor(private readonly pathRepository: PathRepositoryPort) {}

  async execute(): Promise<LearningPathSummary[]> {
    const paths = await this.pathRepository.findAll();
    return paths.map((path) => {
      const coverVideoId = path.modules
        .flatMap((m) => m.lessons)
        .map((l) => l.segment.videoId)
        .find((id) => YOUTUBE_VIDEO_ID.test(id));
      return {
      id: path.id,
      title: path.title,
      description: path.description,
      subject: path.subject,
      modulesCount: path.modules.length,
      lessonsCount: path.totalLessonsCount,
      reviewedLessonsCount: path.modules.reduce(
        (sum, m) => sum + m.lessons.filter((l) => l.reviewedByHuman).length,
        0,
      ),
      totalDurationSeconds: path.totalDurationSeconds,
      ...(coverVideoId ? { coverVideoId } : {}),
      ...(path.coverUrl ? { coverUrl: path.coverUrl } : {}),
      };
    });
  }
}
