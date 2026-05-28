import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  SkillsGroupSchema,
  type ParseError,
  type SkillsGroup,
} from '../model.js';
import { readMarkdownFile } from './markdown.js';

const FrontmatterSchema = z.union([
  z.object({ groups: z.array(SkillsGroupSchema).min(1) }),
  z.object({ items: z.array(z.string()).min(1) }),
]);

export async function parseSkills(
  sourceDir: string,
): Promise<{ skills: SkillsGroup[]; errors: ParseError[] }> {
  const path = join(sourceDir, 'skills.md');
  if (!existsSync(path)) return { skills: [], errors: [] };

  const file = await readMarkdownFile(path);
  const parsed = FrontmatterSchema.safeParse(file.data);
  if (!parsed.success) {
    return {
      skills: [],
      errors: parsed.error.issues.map((i) => ({
        file: path,
        field: i.path.join('.'),
        message: i.message,
      })),
    };
  }

  const data = parsed.data;
  if ('groups' in data) return { skills: data.groups, errors: [] };
  return { skills: [{ items: data.items }], errors: [] };
}
