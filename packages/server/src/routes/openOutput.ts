import { Hono } from 'hono';
import { spawn } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { defaultOutputDir } from '../config.js';
import { getActiveSource } from '../sources.js';

export const openOutputRoutes = new Hono();

openOutputRoutes.post('/open-output', async (c) => {
  const file = c.req.query('file') ?? '';
  const active = await getActiveSource();
  if (!active) return c.text('No active source', 400);
  const outDir = resolve(active.outputDir ?? defaultOutputDir(active.path));
  const target = resolve(file);
  const rel = relative(outDir, target);
  if (rel.startsWith('..') || rel.split('/').includes('..')) {
    return c.text('Forbidden', 403);
  }
  spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
  return c.body(null, 204);
});
