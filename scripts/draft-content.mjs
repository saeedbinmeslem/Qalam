#!/usr/bin/env node
/**
 * @file draft-content.mjs
 * @description يولّد مسودات المحتوى لكل الدروس عبر Gemini: ملاحظات من الفيديو ثم أسئلة اختبار.
 * كل الناتج «مسودة»: لا يُعتمد أي درس ولا سؤال هنا (الاعتماد قرار المالك بعد المشاهدة).
 * يعمل على المخزن المحلي (لقطة JSON) ويُستأنف: لا يعيد توليد ما اكتمل، ويعيد المحاولة عند ضغط الخدمة.
 *
 * التشغيل (بعد npx tsc --build):  npm run draft-content
 * متغيرات: GEMINI_API_KEY و ADMIN_EMAILS من apps/web/.env.local، QALAM_LOCAL_STORE اختياري،
 *          QUESTIONS_PER_LESSON (الافتراضي 4)، ONLY_LESSON لمعرّف درس واحد.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// قراءة .env.local دون طباعة القيم
const env = { ...process.env };
try {
  for (const line of readFileSync(join(root, 'apps/web/.env.local'), 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !(line.slice(0, i) in env)) env[line.slice(0, i)] = line.slice(i + 1);
  }
} catch {
  /* لا ملف: نعتمد على متغيرات البيئة */
}
if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY غير مضبوط');
const adminEmail = (env.ADMIN_EMAILS ?? '').split(',')[0]?.trim();
if (!adminEmail) throw new Error('ADMIN_EMAILS غير مضبوط');

const load = (pkg) => import(pathToFileURL(join(root, 'packages', pkg, 'dist/index.js')).href);
const domain = await load('domain');
const app = await load('application');
const infra = await load('infrastructure');

const file = new infra.FileSnapshotStore(env.QALAM_LOCAL_STORE || join(root, 'apps/web/.data/local-store.json'));
const paths = new infra.InMemoryPathRepository();
const concepts = new infra.InMemoryConceptRepository();
const questions = new infra.InMemoryQuestionRepository();
const events = new infra.InMemoryEventRecorder();

const saved = file.load();
if (saved) {
  for (const p of saved.paths) await paths.save(p);
  for (const c of saved.concepts) await concepts.save(c);
  for (const q of saved.questions) await questions.save(q);
  for (const e of saved.events) await events.record(e);
} else {
  const seed = infra.createInitialSeedPath();
  await paths.save(seed.path);
  for (const c of seed.concepts) await concepts.save(c);
}
const persist = () =>
  file.save(
    infra.takeSnapshot({ paths: paths.list(), concepts: concepts.list(), questions: questions.list(), events: events.events }),
  );

const deps = {
  paths,
  concepts,
  questions,
  ids: infra.randomIdGenerator,
  policy: domain.AdminPolicy.fromList(env.ADMIN_EMAILS),
  llm: new infra.GeminiLlmClient(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined),
};
const actor = { id: 'script', email: adminEmail };
const perLesson = Number(env.QUESTIONS_PER_LESSON) || 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(label, work, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      return await work();
    } catch (error) {
      const transient = /ضغط مؤقت|انتهت|انقطع الاتصال|تعذّر الاتصال/.test(error.message);
      if (!transient || i >= attempts) throw error;
      console.log(`  … ${label}: ${error.message.slice(0, 70)} — إعادة المحاولة ${i}/${attempts - 1}`);
      await sleep(15_000 * i);
    }
  }
}

const draftNotes = new app.DraftLessonNotesUseCase(deps);
const generate = new app.GenerateQuestionsUseCase(deps);
const summary = { notes: 0, questions: 0, skipped: 0, failed: [] };

for (const path of await paths.findAll()) {
  for (const module of path.modules) {
    for (const lesson of module.lessons) {
      if (env.ONLY_LESSON && lesson.id !== env.ONLY_LESSON) continue;
      console.log(`▶ ${lesson.title}`);
      try {
        let current = (await paths.findById(path.id)).findLesson(lesson.id).lesson;
        if (!current.notes) {
          await withRetry('الملاحظات', () => draftNotes.execute({ actor, pathId: path.id, lessonId: lesson.id }));
          summary.notes++;
          persist();
          console.log('  ✓ ملاحظات');
        } else summary.skipped++;

        const existing = await questions.findByLesson(lesson.id);
        if (existing.length === 0) {
          const { created } = await withRetry('الأسئلة', () =>
            generate.execute({ actor, pathId: path.id, lessonId: lesson.id, count: perLesson }),
          );
          summary.questions += created;
          persist();
          console.log(`  ✓ ${created} أسئلة (مسودات)`);
        }
      } catch (error) {
        summary.failed.push({ lesson: lesson.title, error: error.message });
        console.log(`  ✗ ${error.message}`);
      }
    }
  }
}
persist();
console.log('\nالنتيجة:', JSON.stringify(summary, null, 1));
