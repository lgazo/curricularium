import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EducationEntrySchema,
  type EducationEntry,
  type ParseError,
} from '../model.js';
import { readMarkdownFile, renderMarkdown } from './markdown.js';

export async function parseEducation(
  sourceDir: string,
): Promise<{ entries: EducationEntry[]; errors: ParseError[] }> {
  const dir = join(sourceDir, 'education');
  if (!existsSync(dir)) return { entries: [], errors: [] };

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));

  const errors: ParseError[] = [];
  const entries: EducationEntry[] = [];

  for (const path of files) {
    const file = await readMarkdownFile(path);
    const notes = file.body.trim() ? renderMarkdown(file.body) : undefined;
    const candidate = { ...file.data, ...(notes ? { notes } : {}) };
    const parsed = EducationEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        errors.push({ file: path, field: i.path.join('.'), message: i.message });
      }
      continue;
    }
    entries.push(parsed.data);
  }

  entries.sort((a, b) => b.start.localeCompare(a.start));
  return { entries, errors };
}
