import { serve } from '@hono/node-server';
import { buildApp } from './routes/index.js';
import { getActiveSource } from './sources.js';
import { startWatching, stopWatching } from './watcher.js';

const port = Number(process.env.PORT ?? 3000);

async function reattachWatcher(): Promise<void> {
  const active = await getActiveSource();
  if (!active) {
    stopWatching();
    return;
  }
  startWatching(active.path);
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
