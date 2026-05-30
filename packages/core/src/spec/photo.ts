import { readFile, stat } from 'node:fs/promises';

export type PhotoData = { mime: string; base64: string };

const EXT_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const MAX_BYTES = 8 * 1024 * 1024;

export async function loadPhoto(absPath: string | null | undefined): Promise<PhotoData | null> {
  if (!absPath) return null;
  try {
    const s = await stat(absPath);
    if (!s.isFile()) return null;
    if (s.size > MAX_BYTES) return null;
  } catch { return null; }
  const ext = absPath.slice(absPath.lastIndexOf('.')).toLowerCase();
  const mime = EXT_MIME[ext];
  if (!mime) return null;
  const buf = await readFile(absPath);
  return { mime, base64: buf.toString('base64') };
}

export function toDataUri(p: PhotoData): string {
  return `data:${p.mime};base64,${p.base64}`;
}
