import { describe, expect, it } from 'vitest';
import { computeLints } from '../../src/loader/lints.js';
import type { SpecCV, VariantManifest } from '../../src/spec/model.js';

function variant(): VariantManifest {
  return {
    type: 'variant', name: 'x', title: 'X', targetRole: 'X',
    sectionOrder: ['personal', 'identity', 'work-experience'],
    lang: 'en', sourceMaster: '', outputTargets: [], summaryMode: 'summary',
    collapseOpenSource: false, body: '',
  };
}

function bareCV(): SpecCV {
  return {
    variantRoot: '/r', variant: variant(),
    personal: null, identity: { headline: null, about: null },
    workExperience: [], projects: [], education: [], community: [],
    openSource: [], awards: [], publications: [], skills: null, languages: null,
  };
}

describe('computeLints', () => {
  it('flags banned-string matches in bodies', () => {
    const cv = bareCV();
    cv.workExperience.push({
      type: 'work-experience', name: 'a', source: null, order: 0, lang: 'en',
      employer: 'X', position: 'Y', periodStart: '2024-01', periodEnd: 'present',
      location: 'X', url: null, skills: [], keywords: [], refProjects: [],
      teamSize: null, reportLine: null,
      body: '- Negotiated my salary upward.',
    });
    const w = computeLints(cv, ['salary']);
    expect(w.some((x) => x.category === 'banned-string')).toBe(true);
  });

  it('flags bullets that do not start with an action verb', () => {
    const cv = bareCV();
    cv.workExperience.push({
      type: 'work-experience', name: 'a', source: null, order: 0, lang: 'en',
      employer: 'X', position: 'Y', periodStart: '2024-01', periodEnd: 'present',
      location: 'X', url: null, skills: [], keywords: [], refProjects: [],
      teamSize: null, reportLine: null,
      body: '- Was responsible for hiring.',
    });
    const w = computeLints(cv, []);
    expect(w.some((x) => x.category === 'action-verb')).toBe(true);
  });

  it('flags period-end before period-start', () => {
    const cv = bareCV();
    cv.education.push({
      type: 'education', name: 'a', source: null, order: 0, lang: 'en',
      institution: 'U', location: 'X', degree: 'BSc', field: 'CS',
      periodStart: '2024-01', periodEnd: '2020-01',
      honours: null, url: null, body: '',
    });
    const w = computeLints(cv, []);
    expect(w.some((x) => x.category === 'date')).toBe(true);
  });

  it('flags refProjects slug missing in projects[]', () => {
    const cv = bareCV();
    cv.workExperience.push({
      type: 'work-experience', name: 'a', source: null, order: 0, lang: 'en',
      employer: 'X', position: 'Y', periodStart: '2024-01', periodEnd: 'present',
      location: 'X', url: null, skills: [], keywords: [],
      refProjects: ['unknown'],
      teamSize: null, reportLine: null, body: '',
    });
    const w = computeLints(cv, []);
    expect(w.some((x) => x.category === 'cross-atom')).toBe(true);
  });

  it('flags acronym used before first-use full term', () => {
    const cv = bareCV();
    cv.workExperience.push({
      type: 'work-experience', name: 'a', source: null, order: 0, lang: 'en',
      employer: 'X', position: 'Y', periodStart: '2024-01', periodEnd: 'present',
      location: 'X', url: null, skills: [], keywords: [], refProjects: [],
      teamSize: null, reportLine: null,
      body: '- Shipped DAP analytics.',
    });
    const w = computeLints(cv, []);
    expect(w.some((x) => x.category === 'acronym')).toBe(true);
  });
});
