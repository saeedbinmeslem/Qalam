/**
 * @file adaptation-rules.ts
 * @description خدمة نطاق قواعد التكيّف الأوليّة (Domain Service)
 *
 * تحدد القواعد المنطقية الصرفة لتكييف خطة المتعلّم بناءً على إتقانه وأدائه.
 * هذه الخدمة خالية تماماً من أي اتصال بقاعدة بيانات أو استدعاءات شبكة.
 */

import { ConceptId } from '../value-objects/identifiers.js';
import { MasteryState } from '../value-objects/mastery-state.js';

export interface AdaptationDecision {
  /** الإجراء المقترح للمتعلم */
  action: 'proceed' | 'review' | 'alternative_lesson' | 'diagnostic_skip';
  /** المفهوم المستهدف */
  conceptId: ConceptId;
  /** سبب اتخاذ هذا القرار (للشفافية ولقياس الأثر) */
  reasonArabic: string;
}

export class AdaptationRules {
  /**
   * تقييم ما إذا كان المتعلم مستعداً للانتقال إلى المفهوم التالي
   * أو يحتاج لمراجعة متطلبات سابقة
   */
  static evaluateNextStep(
    targetConceptId: ConceptId,
    prerequisiteStates: Map<ConceptId, MasteryState>
  ): AdaptationDecision {
    // فحص جميع المتطلبات السابقة
    for (const [prereqId, state] of prerequisiteStates.entries()) {
      if (state.level !== 'mastered') {
        return {
          action: 'review',
          conceptId: prereqId,
          reasonArabic: `يجب إتقان المتطلب السابق قبل الانتقال إلى هذا المفهوم، درجة الثقة الحالية: ${(state.confidenceScore * 100).toFixed(0)}%`,
        };
      }
    }

    return {
      action: 'proceed',
      conceptId: targetConceptId,
      reasonArabic: 'تم إتقان جميع المتطلبات السابقة بنجاح، يمكن الانتقال للدرس التالي',
    };
  }

  /**
   * تقييم نتيجة اختبار أو تمرين وتحديد هل يحتاج المتعلم لدرس بديل
   */
  static evaluateAttemptFailure(
    conceptId: ConceptId,
    consecutiveFailuresCount: number
  ): AdaptationDecision {
    if (consecutiveFailuresCount >= 2) {
      return {
        action: 'alternative_lesson',
        conceptId,
        reasonArabic:
          'تعثر المتعلّم في محاولتين متتاليتين، تم اقتراح درس بديل يوضح المفهوم بأسلوب مختلف',
      };
    }

    return {
      action: 'review',
      conceptId,
      reasonArabic: 'محاولة غير ناجحة، ينصح بمراجعة الملاحظات وإعادة حل التمرين',
    };
  }
}
