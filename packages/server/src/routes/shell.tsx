import { Hono } from 'hono';
import type { Context } from 'hono';
import { join, resolve, sep } from 'node:path';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import { loadConfig, defaultOutputDir, saveConfig } from '../config.js';
import { sourceAvailability, getActiveSource } from '../sources.js';
import { discoverVariants, listOutputs, loadVariant } from '@curricularium/core';
import type { LoadWarning } from '@curricularium/core';

export const shellRoutes = new Hono();

function isSafeVariantName(name: string): boolean {
  if (name === '.' || name === '..') return false;
  return /^[A-Za-z0-9._-]+$/.test(name);
}

async function renderShell(c: Context, addSourceError?: string) {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  const active = await getActiveSource();
  const variants = active ? await discoverVariants(active.path) : [];
  const outputs = listOutputs();
  const outputDir = active ? (active.outputDir ?? defaultOutputDir(active.path)) : null;

  let warnings: LoadWarning[] = [];
  if (active && config.activeVariantName && isSafeVariantName(config.activeVariantName)) {
    const variantRoot = resolve(join(active.path, config.activeVariantName));
    const sourceRoot = resolve(active.path);
    if (variantRoot === sourceRoot || variantRoot.startsWith(sourceRoot + sep)) {
      const r = await loadVariant(variantRoot);
      if (r.ok) warnings = r.warnings;
    }
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
  const active = await getActiveSource();

  const submittedVariant = String(form['variant'] ?? '');
  const submittedOutput = String(form['output'] ?? '');
  const submittedTheme = String(form['theme'] ?? '');

  let nextVariant: string | null = null;
  if (active && submittedVariant) {
    if (!isSafeVariantName(submittedVariant)) return c.text('invalid variant', 400);
    const variants = await discoverVariants(active.path);
    if (variants.some((v) => v.name === submittedVariant)) {
      nextVariant = submittedVariant;
    } else {
      return c.text('invalid variant', 400);
    }
  }

  let nextOutput: string | null = null;
  let nextTheme: string | null = null;
  if (submittedOutput) {
    const outputs = listOutputs();
    const output = outputs.find((o) => o.id === submittedOutput);
    if (!output) return c.text('invalid output', 400);
    nextOutput = submittedOutput;
    if (submittedTheme) {
      if (!output.themes.some((t) => t.id === submittedTheme)) {
        return c.text('invalid theme', 400);
      }
      nextTheme = submittedTheme;
    }
  }

  const next = {
    ...config,
    activeVariantName: nextVariant,
    activeOutputId: nextOutput,
    activeThemeId: nextTheme,
  };
  await saveConfig(next);
  return renderShell(c);
});

export { renderShell };
