import { describe, expect, it } from 'vitest';
import { VideoSegment } from './video-segment.js';

describe('VideoSegment (كائن قيمة المقطع الزمني)', () => {
  it('يجب أن ينشئ مقطع فيديو صالح عندما تكون الأوقات صحيحة', () => {
    const segment = new VideoSegment({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 60,
      endSeconds: 180,
    });

    expect(segment.videoId).toBe('dQw4w9WgXcQ');
    expect(segment.startSeconds).toBe(60);
    expect(segment.endSeconds).toBe(180);
    expect(segment.durationSeconds).toBe(120);
    expect(segment.toEmbedUrl()).toContain('start=60&end=180');
  });

  it('يجب أن يرمي استثناء إذا كان وقت النهاية أقل من أو يساوي البداية', () => {
    expect(() => {
      new VideoSegment({
        videoId: 'abc',
        startSeconds: 100,
        endSeconds: 50,
      });
    }).toThrowError(/يجب أن يكون أكبر/);
  });

  it('يجب أن يرمي استثناء إذا كانت البداية سالبة', () => {
    expect(() => {
      new VideoSegment({
        videoId: 'abc',
        startSeconds: -5,
        endSeconds: 50,
      });
    }).toThrowError(/سالب/);
  });

  it('يجب أن يرمي استثناء إذا كان معرّف الفيديو فارغاً', () => {
    expect(() => {
      new VideoSegment({
        videoId: '',
        startSeconds: 0,
        endSeconds: 50,
      });
    }).toThrowError(/معرّف الفيديو مطلوب/);
  });
});
