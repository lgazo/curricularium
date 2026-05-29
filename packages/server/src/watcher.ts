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
