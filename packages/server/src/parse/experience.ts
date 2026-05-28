import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ExperienceEntrySchema,
  type ExperienceEntry,
  type ParseError,
} from '../model.js';
import { readMarkdownFile, splitBulletList } from './markdown.js';

export async function parseExperience(
  sourceDir: string,
): Promise<{ entries: ExperienceEntry[]; errors: ParseError[] }> {
  const dir = join(sourceDir, 'experience');
  if (!existsSync(dir)) return { entries: [], errors: [] };

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));

  const errors: ParseError[] = [];
  const entries: ExperienceEntry[] = [];

  for (const path of files) {
    const file = await readMarkdownFile(path);
    const candidate = { ...file.data, bullets: splitBulletList(file.body) };
    const parsed = ExperienceEntrySchema.safeParse(candidate);
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
