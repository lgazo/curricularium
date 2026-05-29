import { Hono } from 'hono';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { loadConfig, defaultOutputDir } from '../config.js';
import { getActiveSource } from '../sources.js';
import { loadVariant, render } from '@curricularium/core';

export const generateRoutes = new Hono();

generateRoutes.post('/generate', async (c) => {
  const active = await getActiveSource();
  const config = await loadConfig();
  if (!active || !config.activeVariantName) {
    return c.html(<span class="generate-err">No active variant.</span>);
  }
  const variant = config.activeVariantName;
  if (!/^[A-Za-z0-9._-]+$/.test(variant) || variant === '.' || variant === '..') {
    return c.html(<span class="generate-err">Forbidden variant name.</span>);
  }
  const outputId = config.activeOutputId ?? 'html';
  const themeId = config.activeThemeId ?? 'linkedin-spiritual';
  const variantRoot = resolve(join(active.path, variant));
  const sourceRoot = resolve(active.path);
  if (!variantRoot.startsWith(sourceRoot + sep) && variantRoot !== sourceRoot) {
    return c.html(<span class="generate-err">Forbidden variant path.</span>);
  }
  const lr = await loadVariant(variantRoot);
  if (!lr.ok) {
    return c.html(<span class="generate-err">load failed: {lr.errors[0]?.message ?? 'unknown'}</span>);
  }
  let rr;
  try {
    rr = await render({ cv: lr.cv, outputId, themeId });
  } catch (err) {
    return c.html(<span class="generate-err">render failed: {(err as Error).message}</span>);
  }
  const outDir = active.outputDir ?? defaultOutputDir(active.path);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, rr.filename);
  await writeFile(outPath, rr.bytes);
  return c.html(
    <span>
      ✓ wrote <code>{outPath}</code>{' '}
      <button type="button" hx-post={`/open-output?file=${encodeURIComponent(outPath)}`} hx-swap="none">Open file</button>
    </span>,
  );
});
