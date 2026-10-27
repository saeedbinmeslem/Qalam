/**
 * @file quiz-question.ts
 * @description سؤال اختيار من متعدد مرتبط بدرس ومفهوم. أسئلة الذكاء الاصطناعي تُنشأ «مسودة»
 * ولا تصل للمتعلم إلا بعد اعتماد المالك لها (المراجعة البشرية). أي تعديل على محتوى السؤال يعيده مسودة.
 */

import type { ConceptId, LessonId, QuestionId } from '../value-objects/identifiers.js';

export type QuestionStatus = 'draft' | 'approved';
export type QuestionOrigin = 'ai' | 'manual';

export const MIN_CHOICES = 3;
export const MAX_CHOICES = 5;

export interface QuizQuestionProps {
  id: QuestionId;
  lessonId: LessonId;
  /** المفهوم الذي يقيسه السؤال (يُستعمل لاكتشاف المفاهيم الضعيفة) */
  conceptId: ConceptId;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** شرح يظهر بعد الإجابة، ويجب أن يستند إلى مصدر الدرس */
  explanation: string;
  status?: QuestionStatus;
  origin?: QuestionOrigin;
}

export class QuizQuestion {
  readonly id: QuestionId;
  readonly lessonId: LessonId;
  readonly conceptId: ConceptId;
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly status: QuestionStatus;
  readonly origin: QuestionOrigin;

  constructor(props: QuizQuestionProps) {
    const prompt = props.prompt?.trim();
    if (!prompt) throw new Error('نص السؤال مطلوب');

    const choices = (props.choices ?? []).map((c) => c.trim());
    if (choices.length < MIN_CHOICES || choices.length > MAX_CHOICES) {
      throw new Error(`عدد الخيارات يجب أن يكون بين ${MIN_CHOICES} و${MAX_CHOICES}`);
    }
    if (choices.some((c) => c.length === 0)) throw new Error('الخيارات لا يمكن أن تكون فارغة');
    if (new Set(choices).size !== choices.length) throw new Error('الخيارات يجب ألا تتكرر');
    if (!Number.isInteger(props.correctIndex) || props.correctIndex < 0 || props.correctIndex >= choices.length) {
      throw new Error('رقم الإجابة الصحيحة خارج نطاق الخيارات');
    }

    this.id = props.id;
    this.lessonId = props.lessonId;
    this.conceptId = props.conceptId;
    this.prompt = prompt;
    this.choices = Object.freeze(choices);
    this.correctIndex = props.correctIndex;
    this.explanation = (props.explanation ?? '').trim();
    this.status = props.status ?? 'draft';
    this.origin = props.origin ?? 'manual';
  }

  get isApproved(): boolean {
    return this.status === 'approved';
  }

  approve(): QuizQuestion {
    return this.with({ status: 'approved' });
  }

  /** تعديل المحتوى يعيد السؤال مسودة ليُراجَع من جديد */
  edit(content: { prompt: string; choices: string[]; correctIndex: number; explanation: string }): QuizQuestion {
    return this.with({ ...content, status: 'draft' });
  }

  private with(changes: Partial<QuizQuestionProps>): QuizQuestion {
    return new QuizQuestion({
      id: this.id,
      lessonId: this.lessonId,
      conceptId: this.conceptId,
      prompt: this.prompt,
      choices: [...this.choices],
      correctIndex: this.correctIndex,
      explanation: this.explanation,
      status: this.status,
      origin: this.origin,
      ...changes,
    });
  }
}
