import { Marked } from 'marked';

const md = new Marked({ gfm: true, breaks: false });

export function renderMarkdown(body: string): string {
  return md.parse(body) as string;
}

export function splitBulletList(body: string): string[] {
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
