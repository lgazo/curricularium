import chokidar, { type FSWatcher } from 'chokidar';
import { broadcast } from './sse.js';
import { loadVariant } from '@curricularium/core';

let active: FSWatcher | null = null;
let activePath: string | null = null;
let activeIdentity: { variant: string; output: string; theme: string } | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function setActiveIdentity(id: { variant: string; output: string; theme: string }): void {
  activeIdentity = id;
}

export function startWatching(variantRoot: string): void {
  if (active && activePath === variantRoot) return;
  stopWatching();
  activePath = variantRoot;
  active = chokidar.watch(variantRoot, {
    ignored: /(^|[\\/])\../,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 25 },
  });
  const fire = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!activePath) return;
      const result = await loadVariant(activePath);
      if (result.ok) {
        // auto-write outputs flagged autoWriteOnRender
        const { loadConfig } = await import('./config.js');
        const { getActiveSource } = await import('./sources.js');
        const { listOutputs, render } = await import('@curricularium/core');
        const { mkdir, writeFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const { defaultOutputDir } = await import('./config.js');

        const cfg = await loadConfig();
        const src = await getActiveSource();
        if (src) {
          const outDir = src.outputDir ?? defaultOutputDir(src.path);
          for (const o of listOutputs()) {
            const isOn = (src.autoWrite as Record<string, boolean>)[o.id] === true && o.autoWriteOnRender;
            if (!isOn) continue;
            const themeId = (cfg.activeOutputId === o.id ? cfg.activeThemeId : null) ?? o.defaultThemeId;
            try {
              const rr = await render({ cv: result.cv, outputId: o.id, themeId });
              const { resolve, sep } = await import('node:path');
              const outDirAbs = resolve(outDir);
              const outPath = resolve(join(outDirAbs, rr.filename));
              if (!outPath.startsWith(outDirAbs + sep) && outPath !== outDirAbs) {
                console.error('[autowrite]', o.id, 'forbidden output filename:', rr.filename);
                continue;
              }
              await mkdir(outDirAbs, { recursive: true });
              await writeFile(outPath, rr.bytes);
            } catch (err) {
              console.error('[autowrite]', o.id, (err as Error).message);
            }
          }
        }

        broadcast({
          event: 'reload',
          data: activeIdentity ?? { variant: '', output: '', theme: '' },
        });
      } else {
        const first = result.errors[0];
        broadcast({
          event: 'parse-error',
          data: { message: first?.message ?? 'load failed', file: first?.file },
        });
      }
    }, 150);
  };
  active.on('add', fire);
  active.on('change', fire);
  active.on('unlink', fire);
  active.on('error', (err) => {
    console.error('[watcher] error:', err);
  });
}

export function stopWatching(): void {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (active) { void active.close(); active = null; }
  activePath = null;
}
