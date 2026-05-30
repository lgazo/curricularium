import type { ThemeDef } from '../../registry.js';
import { buildEuropassXml } from '../adapter.js';
import { loadPhoto } from '../../../spec/photo.js';

export const canonicalTheme: ThemeDef = {
  id: 'canonical',
  label: 'Canonical Europass XML',
  contentType: 'application/xml',
  filenameExt: '.xml',
  render: async (cv) => {
    const photo = await loadPhoto(cv.personal?.photo ?? null);
    const xml = buildEuropassXml(cv, { photo });
    return { bytes: new TextEncoder().encode(xml + '\n'), warnings: [] };
  },
};
