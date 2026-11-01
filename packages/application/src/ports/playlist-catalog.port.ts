/**
 * @file playlist-catalog.port.ts
 * @description منفذ قراءة قائمة تشغيل (بيانات وصفية فقط: عنوان، قناة، مدة). لا نسخ للفيديو ولا نص مفرّغ.
 * التنفيذ الحقيقي (YouTube Data API) في Infrastructure، ولهذا المنفذ تنفيذ وهمي للاختبار.
 */

export interface PlaylistVideo {
  videoId: string;
  title: string;
  channelName: string;
  durationSeconds: number;
  /** وصف الفيديو كما نشره صاحبه (قد يكون فارغًا) */
  description: string;
}

/** منفذ قراءة بيانات فيديوهات مفردة بمعرّفاتها (لاستيراد فيديوهات مستقلة بلا قائمة) */
export interface VideoMetadataPort {
  /** يعيد ما وُجد منها (الخاص والمحذوف يُسقط)؛ الترتيب غير مضمون فيرتّبه المستدعي بمعرّفاته */
  getVideos(videoIds: string[]): Promise<PlaylistVideo[]>;
}

export interface PlaylistCatalogPort {
  /** يعيد فيديوهات القائمة بترتيبها؛ يرمي خطأ عربيًا إن كانت خاصة أو غير موجودة أو الخدمة غير مضبوطة */
  listVideos(playlistId: string): Promise<PlaylistVideo[]>;
}
