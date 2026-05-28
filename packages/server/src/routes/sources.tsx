import { Hono } from 'hono';
import { type Context } from 'hono';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import {
  activateSource,
  addSource,
  removeSource,
  sourceAvailability,
} from '../sources.js';
import { loadConfig } from '../config.js';

export const sourceRoutes = new Hono();

async function renderShell(c: Context, errorMessage?: string) {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  return c.html(
    <Layout title="Curricularium">
      <Shell
        sources={config.sources}
        activeSourceId={config.activeSourceId}
        availability={availability}
        addSourceError={errorMessage}
      />
    </Layout>,
  );
}

sourceRoutes.post('/sources', async (c) => {
  const form = await c.req.parseBody();
  const name = String(form['name'] ?? '');
  const path = String(form['path'] ?? '');
  const result = await addSource({ name, path });
  if (!result.ok) return renderShell(c, result.message);
  return renderShell(c);
});

sourceRoutes.delete('/sources/:id', async (c) => {
  await removeSource(c.req.param('id'));
  return renderShell(c);
});

sourceRoutes.post('/sources/:id/activate', async (c) => {
  await activateSource(c.req.param('id'));
  return renderShell(c);
});
