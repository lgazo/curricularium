import { Hono } from 'hono';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import { loadConfig } from '../config.js';
import { sourceAvailability } from '../sources.js';

export const shellRoutes = new Hono();

shellRoutes.get('/', async (c) => {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  return c.html(
    <Layout title="Curricularium">
      <Shell sources={config.sources} activeSourceId={config.activeSourceId} availability={availability} />
    </Layout>,
  );
});
