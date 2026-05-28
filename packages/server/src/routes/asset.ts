import { Hono } from 'hono';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { getActiveSource } from '../sources.js';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export const assetRoutes = new Hono();

assetRoutes.get('/source-asset/*', async (c) => {
  const source = await getActiveSource();
  if (!source) return c.notFound();

  const requested = c.req.path.replace(/^\/source-asset\//, '');
  const decoded = decodeURIComponent(requested);
  const absolute = resolve(source.path, decoded);
  const rel = relative(source.path, absolute);
  if (rel.startsWith('..') || rel === '' || rel.split('/').includes('..')) {
    return c.text('Forbidden', 403);
  }

  try {
    const stats = await stat(absolute);
    if (!stats.isFile()) return c.notFound();
  } catch {
    return c.notFound();
  }

  const ext = absolute.slice(absolute.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const buf = await readFile(absolute);
  return c.body(buf, 200, { 'Content-Type': mime });
});
