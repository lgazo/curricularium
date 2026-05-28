import chokidar, { type FSWatcher } from 'chokidar';
import { broadcast } from './sse.js';

let active: FSWatcher | null = null;
let activePath: string | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function startWatching(path: string): void {
  if (active && activePath === path) return;
  stopWatching();
  activePath = path;
  active = chokidar.watch(path, {
    ignored: /(^|[\\/])\../,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 25 },
  });
  const fire = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => broadcast({ event: 'reload' }), 150);
  };
  active.on('add', fire);
  active.on('change', fire);
  active.on('unlink', fire);
  active.on('error', (err) => {
    console.error('[watcher] error:', err);
  });
}

export function stopWatching(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (active) {
    void active.close();
    active = null;
  }
  activePath = null;
}
