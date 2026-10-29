/**
 * @file study-guide.ts
 * @description «ملخص للقراءة» للدرس: لمن يفضّل القراءة على المشاهدة (ومنه ملف PDF).
 * يُخزَّن نصًا بسيطًا قابلًا للتحرير يدويًا: سطر `## عنوان` يبدأ قسمًا، وسطر `- نقطة` عنصرًا فيه،
 * وأي سطر آخر فقرة. دوال نقية: التحويل ذهابًا وإيابًا مُختبر، ولا يعتمد الـ Domain على أي مكتبة.
 */

export interface StudyGuideSection {
  /** عنوان القسم (فارغ للفقرة التمهيدية قبل أول عنوان) */
  heading: string;
  paragraphs: string[];
  points: string[];
}

/** يحوّل أقسام منظمة (من النموذج أو المالك) إلى النص المخزَّن */
export function formatStudyGuide(sections: Array<{ heading: string; paragraphs?: string[]; points?: string[] }>): string {
  return sections
    .map((section) => {
      const lines: string[] = [];
      if (section.heading.trim()) lines.push(`## ${section.heading.trim()}`);
      for (const p of section.paragraphs ?? []) if (p.trim()) lines.push(p.trim());
      for (const point of section.points ?? []) if (point.trim()) lines.push(`- ${point.trim()}`);
      return lines.join('\n');
    })
    .filter((block) => block !== '')
    .join('\n\n');
}

/** يقرأ النص المخزَّن إلى أقسام للعرض والطباعة */
export function parseStudyGuide(text: string): StudyGuideSection[] {
  const sections: StudyGuideSection[] = [];
  let current: StudyGuideSection | null = null;
  const ensure = (): StudyGuideSection => {
    if (!current) {
      current = { heading: '', paragraphs: [], points: [] };
      sections.push(current);
    }
    return current;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (line.startsWith('## ')) {
      current = { heading: line.slice(3).trim(), paragraphs: [], points: [] };
      sections.push(current);
    } else if (line.startsWith('- ')) {
      ensure().points.push(line.slice(2).trim());
    } else {
      ensure().paragraphs.push(line);
    }
  }
  return sections.filter((s) => s.heading !== '' || s.paragraphs.length > 0 || s.points.length > 0);
}
