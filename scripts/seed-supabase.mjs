#!/usr/bin/env node
/**
 * @file seed-supabase.mjs
 * @description ينقل محتوى المنصة إلى Supabase بمفتاح الخدمة: المفاهيم أولًا (الدروس تشير إليها)، ثم المسارات
 * والدروس، ثم الأسئلة. المصدر: اللقطة المحلية (`apps/web/.data/local-store.json`) إن وُجدت لتبقى المسودات
 * والاعتمادات كما هي، وإلا البذرة الأولية. لا يغيّر أي علامة «مراجعة بشرية» ولا حالة سؤال. آمن للتكرار (upsert).
 *
 * التشغيل (بعد npx tsc --build وبعد تشغيل الهجرات 001–003 في Supabase):  npm run seed-supabase
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

const client = infra.createSupabaseServiceClient(url, key);
const paths = new infra.SupabasePathRepository(client);
const concepts = new infra.SupabaseConceptRepository(client);
const questions = new infra.SupabaseQuestionRepository(client);

const file = new infra.FileSnapshotStore(env.QALAM_LOCAL_STORE || join(root, 'apps/web/.data/local-store.json'));
const saved = file.load();
const source = saved ?? { ...(() => { const s = infra.createInitialSeedPath(); return { paths: [s.path], concepts: s.concepts, questions: [] }; })() };
console.log(saved ? 'المصدر: اللقطة المحلية' : 'المصدر: البذرة الأولية');

// المفتاح الأجنبي: المسار أولًا (فارغ) ثم مفاهيمه ثم كورساته. concepts.path_id يشير للمسار، وcourses.concept_id للمفهوم
const { LearningPath } = await load('domain');
for (const path of source.paths) {
  await paths.save(new LearningPath({ id: path.id, title: path.title, description: path.description, targetGoal: path.targetGoal, subject: path.subject }));
}
for (const concept of source.concepts) await concepts.save(concept);
console.log(`المفاهيم: ${source.concepts.length}`);
for (const path of source.paths) await paths.save(path);
console.log(`المسارات: ${source.paths.length}`);
for (const question of source.questions) await questions.save(question);
console.log(`الأسئلة: ${source.questions.length}`);
console.log('تم. راجع الدروس في /admin ثم اعتمدها بنفسك.');
