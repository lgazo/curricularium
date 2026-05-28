import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readMarkdownFile, renderMarkdown } from './markdown.js';

export async function parseAbout(sourceDir: string): Promise<string | undefined> {
  const path = join(sourceDir, 'about.md');
  if (!existsSync(path)) return undefined;
  const file = await readMarkdownFile(path);
  const body = file.body.trim();
  if (!body) return undefined;
  return renderMarkdown(body);
}
