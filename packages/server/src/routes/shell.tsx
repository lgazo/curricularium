import { Hono } from 'hono';
import type { Context } from 'hono';
import { join } from 'node:path';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import { loadConfig, defaultOutputDir, saveConfig } from '../config.js';
import { sourceAvailability, getActiveSource } from '../sources.js';
import { discoverVariants, listOutputs, loadVariant } from '@curricularium/core';
import type { LoadWarning } from '@curricularium/core';

export const shellRoutes = new Hono();

async function renderShell(c: Context, addSourceError?: string) {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  const active = await getActiveSource();
  const variants = active ? await discoverVariants(active.path) : [];
  const outputs = listOutputs();
  const outputDir = active ? (active.outputDir ?? defaultOutputDir(active.path)) : null;

  let warnings: LoadWarning[] = [];
  if (active && config.activeVariantName) {
    const r = await loadVariant(join(active.path, config.activeVariantName));
    if (r.ok) warnings = r.warnings;
  }

  return c.html(
    <Layout title="Curricularium">
      <Shell
        sources={config.sources}
        activeSourceId={config.activeSourceId}
        availability={availability}
        addSourceError={addSourceError}
        variants={variants}
        outputs={outputs}
        activeVariantName={config.activeVariantName}
        activeOutputId={config.activeOutputId}
        activeThemeId={config.activeThemeId}
        outputDir={outputDir}
        warnings={warnings}
      />
    </Layout>,
  );
}

shellRoutes.get('/', (c) => renderShell(c));

shellRoutes.post('/select', async (c) => {
  const form = await c.req.parseBody();
  const config = await loadConfig();
  const next = {
    ...config,
    activeVariantName: String(form['variant'] ?? '') || null,
    activeOutputId: String(form['output'] ?? '') || null,
    activeThemeId: String(form['theme'] ?? '') || null,
  };
  await saveConfig(next);
  return renderShell(c);
});

export { renderShell };
