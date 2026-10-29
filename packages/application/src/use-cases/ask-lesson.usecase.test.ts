import { describe, expect, it } from 'vitest';
import {
  LearningPath,
  Lesson,
  Module,
  VideoSegment,
  createConceptId,
  createLessonId,
  createModuleId,
  createPathId,
} from '@qalam/domain';
import type { LlmClient, LlmJsonRequest } from '../ports/llm-client.port.js';
import { AskLessonUseCase } from './ask-lesson.usecase.js';

function pathWith(notes?: string): LearningPath {
  const path = new LearningPath({ id: createPathId('p'), title: 'م', description: '', targetGoal: 'هدف', subject: 'عام' });
  const module = new Module({ id: createModuleId('m'), title: 'و', description: '', orderIndex: 1 });
  module.addLesson(
    new Lesson({
      id: createLessonId('l'),
      title: 'النظام الثنائي',
      conceptId: createConceptId('c'),
      segment: new VideoSegment({ videoId: 'abcdefghijk', startSeconds: 0, endSeconds: 60 }),
      sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      channelName: 'قناة',
      notes,
    }),
  );
  path.addModule(module);
  return path;
}

const paths = (path: LearningPath) => ({
  save: async () => {},
  delete: async () => {},
  findById: async () => path,
  findBySubject: async () => [],
  findAll: async () => [path],
});

const ask = { pathId: 'p', lessonId: 'l', question: 'ما هو البت؟' };

describe('AskLessonUseCase (اسأل قلم)', () => {
  it('يرسل مادة الدرس والسؤال ويعيد الإجابة المبنية عليها', async () => {
    const calls: LlmJsonRequest[] = [];
    const llm: LlmClient = {
      generateJson: async (r) => (calls.push(r), { answerable: true, answer: ' البت أصغر وحدة بيانات. ' }),
    };
    const out = await new AskLessonUseCase({ paths: paths(pathWith('البت هو 0 أو 1')), llm }).execute(ask);
    expect(out).toEqual({ answer: 'البت أصغر وحدة بيانات.', grounded: true });
    expect(calls[0]?.user).toContain('البت هو 0 أو 1');
    expect(calls[0]?.user).toContain('ما هو البت؟');
    expect(calls[0]?.system).toContain('من خارجها');
  });

  it('يعيد grounded=false حين لا تغطي المادة السؤال', async () => {
    const llm: LlmClient = { generateJson: async () => ({ answerable: false, answer: 'لا تغطيه المادة، راجع الفيديو.' }) };
    const out = await new AskLessonUseCase({ paths: paths(pathWith('نص')), llm }).execute(ask);
    expect(out.grounded).toBe(false);
  });

  it('يرفض: سؤال فارغ/طويل، بلا مفتاح، بلا مادة، وردّ تالف', async () => {
    const ok: LlmClient = { generateJson: async () => ({ answerable: true, answer: 'x' }) };
    const useCase = new AskLessonUseCase({ paths: paths(pathWith('نص')), llm: ok });
    await expect(useCase.execute({ ...ask, question: '  ' })).rejects.toThrow('اكتب سؤالك');
    await expect(useCase.execute({ ...ask, question: 'س'.repeat(501) })).rejects.toThrow('طويل');
    await expect(new AskLessonUseCase({ paths: paths(pathWith('نص')), llm: undefined }).execute(ask)).rejects.toThrow('غير مفعّل');
    await expect(new AskLessonUseCase({ paths: paths(pathWith()), llm: ok }).execute(ask)).rejects.toThrow('مادة نصية');
    const bad: LlmClient = { generateJson: async () => ({ answer: 5 }) };
    await expect(new AskLessonUseCase({ paths: paths(pathWith('نص')), llm: bad }).execute(ask)).rejects.toThrow('غير صالح');
  });
});
