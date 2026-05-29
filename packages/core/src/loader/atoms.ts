import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';

export type AtomRaw = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export async function readAtomFile(path: string): Promise<AtomRaw> {
  const raw = await readFile(path, 'utf8');
  const parsed = matter(raw);
  return {
    path,
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}

export function stripHtmlComments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, '');
}
