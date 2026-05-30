import type { ThemeDef } from '../../registry.js';
import { buildEuropassCandidateXml } from '../candidate-adapter.js';

export const candidateTheme: ThemeDef = {
  id: 'candidate',
  label: 'Europass Candidate (v4) XML',
  contentType: 'application/xml',
  filenameExt: '.xml',
  render: async (cv) => {
    const xml = buildEuropassCandidateXml(cv);
    return { bytes: new TextEncoder().encode(xml + '\n'), warnings: [] };
  },
};
