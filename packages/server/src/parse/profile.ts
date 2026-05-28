import { join } from 'node:path';
import { ProfileSchema, type ParseError, type Profile } from '../model.js';
import { readMarkdownFile } from './markdown.js';

export async function parseProfile(
  sourceDir: string,
): Promise<{ profile: Profile } | { errors: ParseError[] }> {
  const path = join(sourceDir, 'profile.md');
  let file;
  try {
    file = await readMarkdownFile(path);
  } catch (err) {
    return {
      errors: [{ file: path, message: `profile.md not found or unreadable: ${(err as Error).message}` }],
    };
  }
  const parsed = ProfileSchema.safeParse(file.data);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => ({
        file: path,
        field: i.path.join('.'),
        message: i.message,
      })),
    };
  }
  return { profile: parsed.data };
}
