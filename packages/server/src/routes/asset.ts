import { Hono } from 'hono';
import { readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import { getActiveSource } from '../sources.js';

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

export const assetRoutes = new Hono();

assetRoutes.get('/source-asset/*', async (c) => {
  const source = await getActiveSource();
  const config = await loadConfig();
  if (!source || !config.activeVariantName) return c.notFound();

  // Validate the variant name (defense-in-depth against poisoned config)
  if (!/^[A-Za-z0-9._-]+$/.test(config.activeVariantName) || config.activeVariantName === '.' || config.activeVariantName === '..') {
    return c.notFound();
  }

  const variantRoot = resolve(join(source.path, config.activeVariantName));
  const sourceRoot = resolve(source.path);
  if (!variantRoot.startsWith(sourceRoot + '/') && variantRoot !== sourceRoot) return c.notFound();

  const requested = c.req.path.replace(/^\/source-asset\//, '');
  const absolute = resolve(variantRoot, decodeURIComponent(requested));
  const rel = relative(variantRoot, absolute);
  if (rel.startsWith('..') || rel === '' || rel.split('/').includes('..')) {
    return c.text('Forbidden', 403);
  }

  try {
    const stats = await stat(absolute);
    if (!stats.isFile()) return c.notFound();
  } catch { return c.notFound(); }

  const ext = absolute.slice(absolute.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const buf = await readFile(absolute);
  return c.body(buf, 200, { 'Content-Type': mime });
});
