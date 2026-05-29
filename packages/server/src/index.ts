import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { buildApp } from './routes/index.js';
import { getActiveSource } from './sources.js';
import { loadConfig } from './config.js';
import { setActiveIdentity, startWatching, stopWatching } from './watcher.js';

const port = Number(process.env.PORT ?? 3000);

async function reattachWatcher(): Promise<void> {
  const active = await getActiveSource();
  const config = await loadConfig();
  if (!active || !config.activeVariantName) {
    stopWatching();
    return;
  }
  setActiveIdentity({
    variant: config.activeVariantName,
    output: config.activeOutputId ?? 'html',
    theme: config.activeThemeId ?? 'linkedin-spiritual',
  });
  startWatching(join(active.path, config.activeVariantName));
}

await reattachWatcher();

const app = buildApp();
const watch = setInterval(reattachWatcher, 2000);

const server = serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`curricularium listening on http://localhost:${port}`);
});

const shutdown = () => {
  clearInterval(watch);
  stopWatching();
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
