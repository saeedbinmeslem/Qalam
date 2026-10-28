import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LearningEvent, QuizQuestion, createLessonId, createQuestionId } from '@qalam/domain';
import { InMemoryEventRecorder } from '../events/event-recorders.js';
import { InMemoryConceptRepository } from './in-memory-concept.repository.js';
import { InMemoryPathRepository } from './in-memory-path.repository.js';
import { InMemoryQuestionRepository } from './in-memory-question.repository.js';
import { FileSnapshotStore, restoreSnapshot, takeSnapshot } from './local-snapshot.js';
import { createInitialSeedPath } from './seed-data.js';

describe('اللقطة المحلية (local-snapshot)', () => {
  const seed = createInitialSeedPath();
  const question = new QuizQuestion({
    id: createQuestionId('q1'),
    lessonId: createLessonId('les-01-data-information'),
    conceptId: seed.concepts[0]!.id,
    prompt: 'س؟',
    choices: ['أ', 'ب', 'ج'],
    correctIndex: 2,
    explanation: 'ش',
    status: 'approved',
    origin: 'ai',
  });
  const event = new LearningEvent({ userId: 'u', type: 'lesson_completed', payload: { lessonId: 'a' }, occurredAt: new Date('2026-01-01') });

  it('يحوّل المخزن إلى JSON ويعيده كما كان بالضبط (ذهابًا وإيابًا)', () => {
    const path = seed.path;
    const lesson = path.modules[0]!.lessons[0]!;
    path.modules[0]!.replaceLesson(lesson.update({ notes: 'ملاحظات المالك', reviewedByHuman: true }));

    const json = JSON.parse(JSON.stringify(takeSnapshot({ paths: [path], concepts: seed.concepts, questions: [question], events: [event] })));
    const restored = restoreSnapshot(json);

    const back = restored.paths[0]!;
    expect(back.totalLessonsCount).toBe(13);
    expect(back.totalDurationSeconds).toBe(path.totalDurationSeconds);
    expect(back.modules.map((m) => m.orderIndex)).toEqual([1, 2, 3]);
    const l = back.findLesson(lesson.id)!.lesson;
    expect(l).toMatchObject({ notes: 'ملاحظات المالك', reviewedByHuman: true, channelName: 'Programming Advices' });
    expect(l.segment.equals(lesson.segment)).toBe(true);
    expect(restored.concepts).toHaveLength(10);
    expect(restored.concepts.find((c) => c.name.includes('الكومبايلر'))?.prerequisiteIds).toHaveLength(1);
    expect(restored.questions[0]).toMatchObject({ id: 'q1', status: 'approved', origin: 'ai', correctIndex: 2 });
    expect(restored.events[0]).toMatchObject({ userId: 'u', type: 'lesson_completed' });
    expect(restored.events[0]?.payload).toEqual({ lessonId: 'a' });
  });

  it('المستودعات تنادي onChange بعد كل تعديل', async () => {
    let changes = 0;
    const onChange = () => void changes++;
    const paths = new InMemoryPathRepository(onChange);
    const concepts = new InMemoryConceptRepository(onChange);
    const questions = new InMemoryQuestionRepository(onChange);
    const events = new InMemoryEventRecorder(onChange);

    await paths.save(seed.path);
    await concepts.save(seed.concepts[0]!);
    await questions.save(question);
    await events.record(event);
    await questions.delete(question.id);
    await concepts.delete(seed.concepts[0]!.id);
    await paths.delete(seed.path.id);
    expect(changes).toBe(7);
  });

  it('FileSnapshotStore يكتب ويقرأ، ويتجاهل الملف التالف أو غير الموجود', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qalam-snap-'));
    try {
      const store = new FileSnapshotStore(join(dir, 'nested', 'store.json'));
      expect(store.load()).toBeNull();

      store.save(takeSnapshot({ paths: [seed.path], concepts: seed.concepts, questions: [question], events: [event] }));
      expect(store.load()?.paths[0]?.title).toBe(seed.path.title);

      const bad = join(dir, 'bad.json');
      writeFileSync(bad, '{ليس json');
      expect(new FileSnapshotStore(bad).load()).toBeNull();
      writeFileSync(bad, JSON.stringify({ version: 99 }));
      expect(new FileSnapshotStore(bad).load()).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
