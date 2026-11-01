import { describe, expect, it } from 'vitest';
import { createPathId } from '@qalam/domain';
import { createInitialSeedPath } from './seed-data.js';
import {
  SupabasePathRepository,
  mapPathRow,
  type PathRow,
  type SupabaseDataClient,
  type SupabaseQuery,
} from './supabase-path.repository.js';

const row: PathRow = {
  id: 'p1',
  title: 'مسار',
  description: null,
  target_goal: 'هدف',
  subject: 'عام',
  cover_url: 'https://res.cloudinary.com/demo/image/upload/v1/p.jpg',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  courses: [
    {
      id: 'co2',
      concept_id: 'c2',
      title: 'كورس ثانٍ',
      description: null,
      order_index: 2,
      modules: [{ id: 'm3', title: 'ج', description: null, order_index: 1, lessons: [lesson('l3', 1)] }],
    },
    {
      id: 'co1',
      concept_id: 'c1',
      title: 'كورس أول',
      description: 'وصف',
      order_index: 1,
      modules: [
        { id: 'm2', title: 'ب', description: null, order_index: 2, lessons: [] },
        { id: 'm1', title: 'أ', description: 'وصف', order_index: 1, lessons: [lesson('l2', 2), lesson('l1', 1)] },
      ],
    },
  ],
};

function lesson(id: string, order: number) {
  return {
    id,
    title: id,
    video_id: 'vid',
    start_seconds: 10,
    end_seconds: 70,
    source_url: 'https://www.youtube.com/watch?v=vid',
    channel_name: 'قناة',
    language: null,
    summary: null,
    reviewed_by_human: null,
    order_index: order,
  };
}

function fakeClient(rows: PathRow[]) {
  const upserts: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
  const deletes: Array<{ table: string; id: string }> = [];
  const client: SupabaseDataClient = {
    from: (table) => ({
      select: () => {
        let filtered = rows;
        const query: SupabaseQuery = {
          eq: (_col, value) => {
            filtered = filtered.filter((r) => r.id === value || r.subject === value);
            return query;
          },
          then: (ok, fail) => Promise.resolve({ data: filtered, error: null }).then(ok, fail),
        };
        return query;
      },
      upsert: async (r) => {
        upserts.push({ table, rows: r });
        return { error: null };
      },
      delete: () => ({
        eq: async (_col, id) => {
          deletes.push({ table, id });
          return { error: null };
        },
      }),
    }),
  };
  return { client, upserts, deletes };
}

describe('mapPathRow', () => {
  it('يرتّب الكورسات والوحدات والدروس ويطبّق القيم الافتراضية', () => {
    const path = mapPathRow(row);
    expect(path.courses.map((c) => [c.id, c.conceptId])).toEqual([['co1', 'c1'], ['co2', 'c2']]);
    expect(path.courses[0]?.modules.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(path.modules.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(path.modules[0]?.lessons.map((l) => l.id)).toEqual(['l1', 'l2']);
    expect(path.modules[0]?.lessons[0]?.language).toBe('ar');
    expect(path.modules[0]?.lessons[0]?.reviewedByHuman).toBe(false);
    expect(path.totalDurationSeconds).toBe(180);
  });

  it('مفهوم الدرس من كورسه لا من الدرس', () => {
    const path = mapPathRow(row);
    expect(path.conceptIdOfLesson('l1' as never)).toBe('c1');
    expect(path.conceptIdOfLesson('l3' as never)).toBe('c2');
  });
});

describe('SupabasePathRepository', () => {
  it('يقرأ بالمعرّف والمجال ويعيد null لغير الموجود', async () => {
    const repo = new SupabasePathRepository(fakeClient([row]).client);
    expect((await repo.findById(createPathId('p1')))?.title).toBe('مسار');
    expect(await repo.findById(createPathId('zzz'))).toBeNull();
    expect(await repo.findBySubject('عام')).toHaveLength(1);
    expect(await repo.findAll()).toHaveLength(1);
  });

  it('يحفظ المسار ثم الكورسات ثم الوحدات ثم الدروس بالترتيب مع order_index', async () => {
    const { client, upserts } = fakeClient([]);
    await new SupabasePathRepository(client).save(createInitialSeedPath().path);
    expect(upserts.map((u) => u.table)).toEqual(['learning_paths', 'courses', 'modules', 'lessons']);
    const courses = upserts[1]?.rows ?? [];
    expect(courses.map((c) => typeof c.concept_id)).toEqual(['string', 'string', 'string']);
    const modules = upserts[2]?.rows ?? [];
    expect(modules.every((m) => typeof m.course_id === 'string')).toBe(true);
    const lessons = upserts[3]?.rows ?? [];
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons.every((l) => typeof l.order_index === 'number' && !('concept_id' in l))).toBe(true);
  });

  it('saveLesson يكتب صف الدرس وحده بوحدته وترتيبه ولا يمسّ بقية المسار', async () => {
    const { client, upserts, deletes } = fakeClient([]);
    const path = createInitialSeedPath().path;
    const target = path.modules[1]!.lessons[1]!;
    await new SupabasePathRepository(client).saveLesson(path, target.id);
    expect(upserts).toHaveLength(1);
    expect(upserts[0]?.table).toBe('lessons');
    expect(upserts[0]?.rows).toHaveLength(1);
    expect(upserts[0]?.rows[0]).toMatchObject({ id: target.id, module_id: path.modules[1]!.id, order_index: 2 });
    expect(deletes).toEqual([]);
  });

  it('يحذف الدروس والوحدات والكورسات المُزالة من المسار ويبقي الباقي', async () => {
    // ما «هو مخزَّن» في القاعدة، مفهرسًا بقيمة عمود الربط (module_id أو course_id أو path_id)
    const stored: Record<string, Record<string, string[]>> = {
      lessons: { 'mod-1-computer-basics': ['les-01-data-information', 'les-removed'] },
      modules: { 'course-1-basics': ['mod-1-computer-basics', 'mod-removed'] },
      courses: {
        [createInitialSeedPath().path.id]: ['course-1-basics', 'course-2-number-systems', 'course-3-networks-languages', 'course-removed'],
      },
    };
    const deletes: Array<{ table: string; id: string }> = [];
    const client: SupabaseDataClient = {
      from: (table) => ({
        select: () => {
          let linkValue = '';
          const query: SupabaseQuery = {
            eq: (_col, value) => {
              linkValue = value;
              return query;
            },
            then: (ok, fail) =>
              Promise.resolve({
                data: (stored[table]?.[linkValue] ?? []).map((id) => ({ id })),
                error: null,
              }).then(ok, fail),
          };
          return query;
        },
        upsert: async () => ({ error: null }),
        delete: () => ({
          eq: async (_col, id) => {
            deletes.push({ table, id });
            return { error: null };
          },
        }),
      }),
    };

    await new SupabasePathRepository(client).save(createInitialSeedPath().path);

    expect(deletes).toContainEqual({ table: 'lessons', id: 'les-removed' });
    expect(deletes).toContainEqual({ table: 'modules', id: 'mod-removed' });
    expect(deletes).toContainEqual({ table: 'courses', id: 'course-removed' });
    expect(deletes.some((d) => d.id === 'les-01-data-information')).toBe(false);
    expect(deletes.some((d) => d.id === 'mod-1-computer-basics')).toBe(false);
    expect(deletes.some((d) => d.id === 'course-1-basics')).toBe(false);
  });

  it('يحذف مسارًا بمعرّفه', async () => {
    const { client, deletes } = fakeClient([]);
    await new SupabasePathRepository(client).delete(createPathId('p1'));
    expect(deletes).toEqual([{ table: 'learning_paths', id: 'p1' }]);
  });
});

describe('صورة الغلاف في Supabase', () => {
  it('تُقرأ من cover_url للمسار والكورس، وغيابها يعني undefined', () => {
    const path = mapPathRow({
      ...row,
      courses: row.courses?.map((c) => (c.id === 'co1' ? { ...c, cover_url: 'https://res.cloudinary.com/demo/image/upload/v1/c.jpg' } : c)) ?? null,
    });
    expect(path.coverUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/p.jpg');
    expect(path.courses.find((c) => c.id === 'co1')?.coverUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/c.jpg');
    expect(path.courses.find((c) => c.id === 'co2')?.coverUrl).toBeUndefined();
  });

  it('تُكتب cover_url (null عند الغياب) عند الحفظ', async () => {
    const { client, upserts } = fakeClient([row]);
    const path = mapPathRow(row);
    await new SupabasePathRepository(client).save(path);
    expect(upserts.find((u) => u.table === 'learning_paths')?.rows[0]?.cover_url).toBe(path.coverUrl);
    expect(upserts.find((u) => u.table === 'courses')?.rows.map((r) => r.cover_url)).toEqual([null, null]);
  });
});
