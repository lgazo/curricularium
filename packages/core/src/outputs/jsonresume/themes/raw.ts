import type { ThemeDef } from '../../registry.js';
import { specCvToJsonResume } from '../adapter.js';

export const rawTheme: ThemeDef = {
  id: 'raw',
  label: 'Raw resume.json',
  contentType: 'application/json',
  filenameExt: '.json',
  render: async (cv) => {
    const resume = specCvToJsonResume(cv);
    const bytes = new TextEncoder().encode(JSON.stringify(resume, null, 2) + '\n');
    return { bytes, warnings: [] };
  },
};
