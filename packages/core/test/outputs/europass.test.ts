import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { findTheme } from '../../src/outputs/registry.js';
import { resolveEuropassBucket } from '../../src/outputs/europass/adapter.js';
import type { SpecCV } from '../../src/spec/model.js';

function cv(): SpecCV {
  return {
    variantRoot: '/r',
    variant: {
      type: 'variant', name: 'x', title: 'X', targetRole: 'X',
      sectionOrder: ['personal', 'identity', 'work-experience', 'skill', 'language'],
      lang: 'en', sourceMaster: '', outputTargets: [],
      summaryMode: 'summary', collapseOpenSource: false, body: '',
    },
    personal: {
      type: 'personal', name: 'p', source: null, order: 0, lang: 'en',
      fullName: 'Jane Doe', targetRole: 'CTO', email: 'j@x.com', phone: '+421000000000',
      location: 'Bratislava, Slovakia', profiles: [], body: '',
    },
    identity: {
      headline: { type: 'identity', subtype: 'headline', name: 'h', source: null, order: 0, lang: 'en', body: 'CTO headline' },
      about: { type: 'identity', subtype: 'about', name: 'a', source: null, order: 0, lang: 'en', body: 'About text.' },
    },
    workExperience: [{
      type: 'work-experience', name: 'foo', source: null, order: 0, lang: 'en',
      employer: 'Foo Inc', position: 'CTO', periodStart: '2022-01', periodEnd: 'present',
      location: 'Remote', url: null, skills: [], keywords: [], refProjects: [],
      teamSize: null, reportLine: null, body: 'Led migration.',
    }],
    projects: [], education: [], community: [], openSource: [], awards: [], publications: [],
    skills: {
      type: 'skill', name: 'skills', source: null, order: 0, lang: 'en',
      groups: [
        { name: 'Leadership', items: ['mentoring'], level: null },
        { name: 'Communication style', items: ['speaking'], level: null },
        { name: 'Tools', items: ['TypeScript'], level: null, europassBucket: 'Digital' },
      ],
      body: '',
    },
    languages: {
      type: 'language', name: 'languages', source: null, order: 0, lang: 'en',
      languages: [
        { code: 'sk', name: 'Slovak', level: 'native', detail: null },
        { code: 'en', name: 'English', level: 'C2', detail: null },
      ],
      body: '',
    },
  };
}

describe('europass bucket resolution', () => {
  it('uses explicit europassBucket when present', () => {
    expect(resolveEuropassBucket({ name: 'Tools', items: [], level: null, europassBucket: 'Digital' }))
      .toBe('Digital');
  });

  it('detects bucket from name substring (case-insensitive)', () => {
    expect(resolveEuropassBucket({ name: 'Communication style', items: [], level: null }))
      .toBe('Communication');
    expect(resolveEuropassBucket({ name: 'Digital fluency', items: [], level: null }))
      .toBe('Digital');
    expect(resolveEuropassBucket({ name: 'Organisational habits', items: [], level: null }))
      .toBe('Organisational');
  });

  it('falls back to JobRelated', () => {
    expect(resolveEuropassBucket({ name: 'Leadership', items: [], level: null }))
      .toBe('JobRelated');
  });
});

describe('europass canonical theme', () => {
  it('renders XML with Identification, Headline, PersonalDescription, WorkExperience', async () => {
    const t = findTheme('europass', 'canonical')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<Identification>');
    expect(xml).toContain('Jane');
    expect(xml).toContain('Doe');
    expect(xml).toContain('<Headline>');
    expect(xml).toContain('CTO headline');
    expect(xml).toContain('<PersonalDescription>');
    expect(xml).toContain('About text.');
    expect(xml).toContain('<WorkExperience>');
    expect(xml).toContain('<Employer>');
    expect(xml).toContain('Foo Inc');
    expect(xml).toContain('<Current>true</Current>');
  });

  it('renders skills into the correct Europass buckets', async () => {
    const t = findTheme('europass', 'canonical')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<JobRelated>');
    expect(xml).toContain('mentoring');
    expect(xml).toContain('<Communication>');
    expect(xml).toContain('speaking');
    expect(xml).toContain('<Digital>');
    expect(xml).toContain('TypeScript');
  });

  it('renders languages with MotherTongue and ForeignLanguage CEFR levels', async () => {
    const t = findTheme('europass', 'canonical')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<MotherTongue>');
    expect(xml).toContain('Slovak');
    expect(xml).toContain('<ForeignLanguage>');
    expect(xml).toContain('English');
    expect(xml).toContain('C2');
  });
});
