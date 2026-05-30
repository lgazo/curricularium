import type { ThemeDef } from '../../registry.js';
import { specCvToJsonResume } from '../adapter.js';
import { loadPhoto, toDataUri } from '../../../spec/photo.js';

export const rawTheme: ThemeDef = {
  id: 'raw',
  label: 'Raw resume.json',
  contentType: 'application/json',
  filenameExt: '.json',
  render: async (cv) => {
    const photo = await loadPhoto(cv.personal?.photo ?? null);
    const photoUrl = photo ? toDataUri(photo) : null;
    const resume = specCvToJsonResume(cv, { photoUrl });
    const bytes = new TextEncoder().encode(JSON.stringify(resume, null, 2) + '\n');
    return { bytes, warnings: [] };
  },
};
