import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { findTheme } from '../../src/outputs/registry.js';
import { specCvToJsonResume } from '../../src/outputs/jsonresume/adapter.js';
import type { SpecCV } from '../../src/spec/model.js';

function bare(): SpecCV {
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
      location: 'Bratislava, Slovakia',
      profiles: [{ network: 'github', url: 'https://github.com/jd', username: 'jd' }],
      body: '',
    },
    identity: {
      headline: { type: 'identity', subtype: 'headline', name: 'h', source: null, order: 0, lang: 'en', body: '0→1 CTO' },
      about: { type: 'identity', subtype: 'about', name: 'a', source: null, order: 0, lang: 'en', body: 'Senior engineer.' },
    },
    workExperience: [{
      type: 'work-experience', name: 'foo', source: null, order: 0, lang: 'en',
      employer: 'Foo Inc', position: 'CTO', periodStart: '2022-01', periodEnd: 'present',
      location: 'Remote', url: 'https://foo.example', skills: [], keywords: [],
      refProjects: [], teamSize: null, reportLine: null,
      body: '> Founded the platform.\n\nLed migration.\n\n- Shipped event sourcing.\n- Hired team.',
    }],
    projects: [], education: [], community: [], openSource: [], awards: [], publications: [],
    skills: null, languages: null,
  };
}

describe('jsonresume adapter', () => {
  it('maps personal → basics including profiles', () => {
    const r = specCvToJsonResume(bare());
    expect(r.basics?.name).toBe('Jane Doe');
    expect(r.basics?.email).toBe('j@x.com');
    expect(r.basics?.label).toBe('0→1 CTO');
    expect(r.basics?.summary).toBe('Senior engineer.');
    expect(r.basics?.location?.city).toBe('Bratislava');
    expect(r.basics?.location?.countryCode).toBe('Slovakia');
    expect(r.basics?.profiles?.[0]?.network).toBe('github');
  });

  it('maps work-experience with date YYYY-MM-DD, summary, highlights', () => {
    const r = specCvToJsonResume(bare());
    const w = r.work?.[0];
    expect(w?.name).toBe('Foo Inc');
    expect(w?.position).toBe('CTO');
    expect(w?.startDate).toBe('2022-01-01');
    expect(w?.endDate).toBeUndefined();
    expect(w?.summary).toContain('Founded the platform.');
    expect(w?.summary).toContain('Led migration.');
    expect(w?.highlights).toEqual(['Shipped event sourcing.', 'Hired team.']);
  });

  it('emits openSource[] extension when collapseOpenSource=false', () => {
    const cv = bare();
    cv.openSource.push({
      type: 'open-source', name: 'lib', source: null, order: 0, lang: 'en',
      title: 'lib', repoUrl: 'https://github.com/x/lib', role: 'author',
      periodStart: '2020-01', periodEnd: 'present', tech: ['Rust'], keywords: [], body: 'OSS library.',
    });
    const r = specCvToJsonResume(cv) as Record<string, unknown>;
    expect(Array.isArray(r['openSource'])).toBe(true);
    expect((r['projects'] as unknown[])?.length ?? 0).toBe(0);
  });

  it('collapses openSource into projects[] when collapseOpenSource=true', () => {
    const cv = bare();
    cv.variant.collapseOpenSource = true;
    cv.openSource.push({
      type: 'open-source', name: 'lib', source: null, order: 0, lang: 'en',
      title: 'lib', repoUrl: 'https://github.com/x/lib', role: 'author',
      periodStart: '2020-01', periodEnd: 'present', tech: ['Rust'], keywords: [], body: 'OSS library.',
    });
    const r = specCvToJsonResume(cv) as Record<string, unknown>;
    expect((r as { openSource?: unknown[] }).openSource).toBeUndefined();
    expect((r['projects'] as unknown[]).length).toBe(1);
  });
});

describe('jsonresume raw theme', () => {
  it('emits resume.json bytes', async () => {
    const t = findTheme('jsonresume', 'raw')!;
    const { bytes } = await t.render(bare(), {});
    const json = JSON.parse(new TextDecoder().decode(bytes));
    expect(json.basics.name).toBe('Jane Doe');
  });
});
