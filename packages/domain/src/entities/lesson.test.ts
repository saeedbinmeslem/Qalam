import { describe, expect, it } from 'vitest';
import { createLessonId } from '../value-objects/identifiers.js';
import { VideoSegment } from '../value-objects/video-segment.js';
import { Lesson } from './lesson.js';

const make = (videoId: string, mediaUrl?: string) =>
  new Lesson({
    id: createLessonId('l'),
    title: 'درس',
    segment: new VideoSegment({ videoId, startSeconds: 0, endSeconds: 60 }),
    sourceUrl: 'https://example.com',
    channelName: 'قناة',
    ...(mediaUrl ? { mediaUrl } : {}),
  });

describe('Lesson.youtubeVideoId', () => {
  it('درس يوتيوب يعيد معرّفه للمصغّرة', () => {
    expect(make('abcdefghijk').youtubeVideoId).toBe('abcdefghijk');
  });

  it('الدرس المرفوع إلى Cloudinary لا مصغّرة له حتى لو شبه معرّفه معرّف يوتيوب', () => {
    expect(make('abcdefghijk', 'https://res.cloudinary.com/demo/video/upload/v1/abcdefghijk.mp4').youtubeVideoId).toBeUndefined();
  });

  it('معرّف بصيغة غير صالحة لا يعطي مصغّرة', () => {
    expect(make('qalam/lessons/long-public-id').youtubeVideoId).toBeUndefined();
  });
});
