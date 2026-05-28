import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { Marked } from 'marked';

const md = new Marked({ gfm: true, breaks: false });

export type FrontmatterFile = {
  path: string;
  data: Record<string, unknown>;
  body: string;
};

export async function readMarkdownFile(path: string): Promise<FrontmatterFile> {
  const raw = await readFile(path, 'utf8');
  const parsed = matter(raw);
  return {
    path,
    data: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}

export function renderMarkdown(body: string): string {
  return md.parse(body) as string;
}

export function splitBulletList(body: string): string[] {
  // Treat top-level list items as bullets; non-list lines are joined and
  // wrapped as a paragraph bullet so authors can choose either style.
  const lines = body.split(/\r?\n/);
  const bullets: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) bullets.push(renderMarkdown(text));
    buffer = [];
  };
  for (const line of lines) {
    const m = /^\s*[-*]\s+(.*)$/.exec(line);
    if (m) {
      flush();
      bullets.push(renderMarkdown(m[1]!));
    } else {
      buffer.push(line);
    }
  }
  flush();
  return bullets;
}
