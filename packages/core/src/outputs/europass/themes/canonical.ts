import type { ThemeDef } from '../../registry.js';
import { buildEuropassXml } from '../adapter.js';

export const canonicalTheme: ThemeDef = {
  id: 'canonical',
  label: 'Canonical Europass XML',
  contentType: 'application/xml',
  filenameExt: '.xml',
  render: async (cv) => {
    const xml = buildEuropassXml(cv);
    return { bytes: new TextEncoder().encode(xml + '\n'), warnings: [] };
  },
};
