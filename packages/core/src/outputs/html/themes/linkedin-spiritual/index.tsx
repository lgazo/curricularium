/* @jsxRuntime automatic */
/* @jsxImportSource hono/jsx */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ThemeDef } from '../../../registry.js';
import { CV } from './CV.js';
import { loadPhoto, toDataUri } from '../../../../spec/photo.js';

const here = dirname(fileURLToPath(import.meta.url));

export const linkedinSpiritualTheme: ThemeDef = {
  id: 'linkedin-spiritual',
  label: 'LinkedIn Spiritual',
  contentType: 'text/html',
  filenameExt: '.html',
  render: async (cv) => {
    const css = await readFile(join(here, 'styles.css'), 'utf8');
    const photo = await loadPhoto(cv.personal?.photo ?? null);
    const photoUrl = photo ? toDataUri(photo) : null;
    const body = (<CV cv={cv as any} photoUrl={photoUrl} />).toString();
    const html = `<!DOCTYPE html>
<html lang="${cv.variant.lang}">
<head>
  <meta charset="utf-8" />
  <title>${cv.personal?.fullName ?? cv.variant.title} — CV</title>
  <style>${css}</style>
</head>
<body>${body}</body>
</html>`;
    return { bytes: new TextEncoder().encode(html), warnings: [] };
  },
};
