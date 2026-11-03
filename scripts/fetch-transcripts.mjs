#!/usr/bin/env node
/**
 * @file fetch-transcripts.mjs
 * @description يجلب النصوص المفرّغة لفيديوهات الدروس من جهازك ويحفظها في Supabase (جدول video_transcripts)،
 * فيجدها الخادم جاهزة عند «إكمال الدروس» ويولّد الملخص والأسئلة بسرعة دون أن يتصل بيوتيوب.
 * يعمل من جهازك لأن يوتيوب يحظر عناوين مراكز البيانات (Vercel) أحيانًا. فيديو واحد كل ~2.5ث، ويتوقف عند توالي الإخفاق.
 * ما بلا نص (لا ترجمة) يُبلَّغ به ويبقى على قراءة الفيديو بالنموذج.
 *
 * التشغيل (بعد npx tsc --build وتشغيل هجرة 008):
 *   npm run fetch-transcripts              كل المسارات
 *   npm run fetch-transcripts -- <pathId>  مسار واحد
 * يقرأ من apps/web/.env.local: NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (لا تُطبع القيم).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const env = { ...process.env };
try {
  for (const line of readFileSync(join(root, 'apps/web/.env.local'), 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !(line.slice(0, i) in env)) env[line.slice(0, i)] = line.slice(i + 1);
  }
} catch {
  /* لا ملف: نعتمد على متغيرات البيئة */
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان');

const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);
const infra = await load('infrastructure');
const app = await load('application');

const client = infra.createSupabaseServiceClient(url, key);
const useCase = new app.FetchTranscriptsUseCase({
  paths: new infra.SupabasePathRepository(client),
  source: new infra.YoutubeTranscriptSource(),
  store: new infra.SupabaseTranscriptStore(client),
});

const pathId = process.argv[2];
console.log(pathId ? `المسار: ${pathId}` : 'كل المسارات');
const result = await useCase.execute({
  pathId,
  onProgress: (done, total, videoId) => {
    if (done % 10 === 0 || done === total) console.log(`  ... ${done}/${total} (${videoId})`);
  },
});
console.log(`جُلب: ${result.fetched} | محفوظ سابقًا: ${result.skipped} | بلا نص: ${result.unavailable} | فشل: ${result.failures.length}`);
for (const f of result.failures) console.log(`  - ${f.videoId}: ${f.message}`);
if (result.stoppedEarly) console.log('توقف مبكرًا بعد إخفاقات متتالية (حظر محتمل). أعد المحاولة لاحقًا ولا تُلحّ.');
