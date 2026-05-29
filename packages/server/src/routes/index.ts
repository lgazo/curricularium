import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { shellRoutes } from './shell.js';
import { sourceRoutes } from './sources.js';
import { previewRoutes } from './preview.js';
import { assetRoutes } from './asset.js';
import { eventRoutes } from './events.js';
import { generateRoutes } from './generate.js';

export function buildApp(): Hono {
  const app = new Hono();
  app.use('/static/*', serveStatic({ root: './src' }));
  app.route('/', shellRoutes);
  app.route('/', previewRoutes);
  app.route('/', sourceRoutes);
  app.route('/', assetRoutes);
  app.route('/', eventRoutes);
  app.route('/', generateRoutes);
  return app;
}
