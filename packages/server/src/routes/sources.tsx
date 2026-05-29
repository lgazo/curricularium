import { Hono } from 'hono';
import { activateSource, addSource, removeSource } from '../sources.js';
import { loadConfig, saveConfig } from '../config.js';
import { renderShell } from './shell.js';

export const sourceRoutes = new Hono();

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
  const config = await loadConfig();
  await saveConfig({ ...config, activeVariantName: null, activeOutputId: null, activeThemeId: null });
  return renderShell(c);
});
