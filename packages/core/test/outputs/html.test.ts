import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { findTheme } from '../../src/outputs/registry.js';
import type { SpecCV } from '../../src/spec/model.js';

function cv(): SpecCV {
  return {
    variantRoot: '/r',
    variant: {
      type: 'variant', name: 'x', title: 'X', targetRole: 'X',
      sectionOrder: ['personal', 'identity', 'work-experience'],
      lang: 'en', sourceMaster: '', outputTargets: [], summaryMode: 'summary',
      collapseOpenSource: false, body: '',
    },
    personal: {
      type: 'personal', name: 'p', source: null, order: 0, lang: 'en',
      fullName: 'Jane Doe', targetRole: 'CTO', email: 'j@x.com', phone: null,
      location: 'Bratislava, Slovakia', profiles: [], photo: null, body: '',
    },
    identity: {
      headline: { type: 'identity', subtype: 'headline', name: 'h', source: null, order: 0, lang: 'en', body: '0→1 CTO' },
      about: { type: 'identity', subtype: 'about', name: 'a', source: null, order: 0, lang: 'en', body: 'Senior engineer.' },
    },
    workExperience: [{
      type: 'work-experience', name: 'foo', source: null, order: 0, lang: 'en',
      employer: 'Foo Inc', position: 'CTO', periodStart: '2022-01', periodEnd: 'present',
      location: 'Remote', url: null, skills: [], keywords: [], refProjects: [],
      teamSize: null, reportLine: null, body: '- Shipped event sourcing.',
    }],
    projects: [], education: [], community: [], openSource: [], awards: [], publications: [],
    skills: null, languages: null,
  };
}

describe('html linkedin-spiritual theme', () => {
  it('renders an HTML document containing the candidate name and section heading', async () => {
    const t = findTheme('html', 'linkedin-spiritual')!;
    const { bytes } = await t.render(cv(), {});
    const html = new TextDecoder().decode(bytes);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Professional Summary');
    expect(html).toContain('Work Experience');
    expect(html).toContain('Foo Inc');
  });
});
