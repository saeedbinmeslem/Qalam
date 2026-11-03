/**
 * @file youtube-transcript-source.ts
 * @description يجلب النص المفرّغ لفيديو عبر مكتبة youtube-transcript-plus. المكتبة تستعمل واجهة يوتيوب غير الرسمية
 * فقد تتعطل أو يُحظر عنوان الخادم؛ لذلك يرمي هذا المحوّل رسالة عربية عند الحظر ويعيد null حين لا يوجد نص،
 * والمستدعون يعودون لقراءة الفيديو بالنموذج في الحالتين. لا نتحايل على الحظر (لا وكلاء ولا تدوير عناوين).
 * ملاحظة: ملف أنواع المكتبة يستورد بلا امتداد فلا يحلّه NodeNext، فنعرّف الشكل الذي نحتاجه محليًا
 * ونتعرّف على أخطائها باسمها (تضبطه المكتبة في كل صنف خطأ).
 */
import type { TranscriptSourcePort } from '@qalam/application';
import type { TranscriptSegment } from '@qalam/domain';
import { fetchTranscript } from 'youtube-transcript-plus';

/** الشكل الذي نستعمله من نتيجة المكتبة (offset بالثواني) */
interface RawSegment {
  text: string;
  offset: number;
}
type FetchFn = (videoId: string, config?: { lang?: string }) => Promise<RawSegment[]>;

/** أخطاء تعني «لا نص لهذا الفيديو»: ليست عطلًا ولا حظرًا */
const NO_TRANSCRIPT_ERRORS = new Set([
  'YoutubeTranscriptDisabledError',
  'YoutubeTranscriptNotAvailableError',
  'YoutubeTranscriptNotAvailableLanguageError',
  'YoutubeTranscriptVideoUnavailableError',
]);

/** المكتبة بلا مهلة: طلب معلّق واحد يوقف الدفعة كلها، فنحدّ كل فيديو بهذه المدة */
const FETCH_TIMEOUT_MS = 25_000;

export class YoutubeTranscriptSource implements TranscriptSourcePort {
  constructor(
    private readonly fetchImpl: FetchFn = fetchTranscript as unknown as FetchFn,
    private readonly timeoutMs: number = FETCH_TIMEOUT_MS,
  ) {}

  async fetch(videoId: string, language?: string): Promise<TranscriptSegment[] | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await Promise.race([
        this.fetchImpl(videoId, language ? { lang: language } : undefined),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('انتهت مهلة جلب النص من يوتيوب')), this.timeoutMs);
        }),
      ]);
      const segments = raw
        .map((s) => ({ startSeconds: s.offset, text: s.text }))
        .filter((s) => s.text.trim().length > 0);
      return segments.length > 0 ? segments : null;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (NO_TRANSCRIPT_ERRORS.has(name)) return null;
      if (name === 'YoutubeTranscriptTooManyRequestError') {
        throw new Error('يوتيوب رفض الطلبات مؤقتًا (كثرة طلبات أو حظر عنوان الخادم). شغّل جلب النصوص من جهازك أو أعد المحاولة لاحقًا');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
