import { describe, expect, it } from 'vitest';
import {
  WorkExperienceSchema,
  PersonalSchema,
  VariantManifestSchema,
  SkillsSchema,
  LanguagesSchema,
  IdentityHeadlineSchema,
  AwardSchema,
} from '../../src/spec/schemas.js';

describe('schemas', () => {
  it('accepts a minimal work-experience atom', () => {
    const ok = WorkExperienceSchema.safeParse({
      type: 'work-experience',
      name: 'nexthink',
      source: 'master-v02/experience/nexthink',
      order: 10,
      lang: 'en',
      employer: 'Nexthink',
      position: 'CTO',
      'period-start': '2024-01',
      'period-end': 'present',
      location: 'Lausanne, Switzerland',
      url: null,
      skills: [],
      keywords: [],
      'ref-projects': [],
      'team-size': null,
      'report-line': null,
      body: 'Led platform...',
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.periodStart).toBe('2024-01');
      expect(ok.data.periodEnd).toBe('present');
      expect(ok.data.refProjects).toEqual([]);
      expect(ok.data.teamSize).toBeNull();
    }
  });

  it('lowercases "Present" in period-end', () => {
    const ok = WorkExperienceSchema.safeParse({
      type: 'work-experience',
      name: 'x', source: null, order: 0, lang: 'en',
      employer: 'X', position: 'Y',
      'period-start': '2020', 'period-end': 'Present',
      location: 'X', url: null, skills: [], keywords: [],
      'ref-projects': [], 'team-size': null, 'report-line': null, body: '',
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.periodEnd).toBe('present');
  });

  it('rejects work-experience missing position', () => {
    const r = WorkExperienceSchema.safeParse({
      type: 'work-experience',
      name: 'x', source: null, order: 0, lang: 'en',
      employer: 'X',
      'period-start': '2020-01', 'period-end': '2021-01',
      location: 'X', url: null, skills: [], keywords: [],
      'ref-projects': [], 'team-size': null, 'report-line': null, body: '',
    });
    expect(r.success).toBe(false);
  });

  it('accepts personal atom with multiple profiles', () => {
    const ok = PersonalSchema.safeParse({
      type: 'personal',
      name: 'personal', source: null, order: 0, lang: 'en',
      'full-name': 'Ladislav Gažo',
      'target-role': 'CTO',
      email: 'l@example.com',
      phone: null,
      location: 'Bratislava, Slovakia',
      profiles: [
        { network: 'linkedin', url: 'https://linkedin.com/in/x', username: 'x' },
      ],
      body: '',
    });
    expect(ok.success).toBe(true);
  });

  it('defaults variant.summaryMode and collapseOpenSource', () => {
    const ok = VariantManifestSchema.safeParse({
      type: 'variant',
      name: 'founder-cto',
      title: 'Founder-CTO',
      'target-role': '0→1 CTO',
      lang: 'en',
      'source-master': 'master-v02',
      'output-targets': [],
      body: '',
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.summaryMode).toBe('summary');
      expect(ok.data.collapseOpenSource).toBe(false);
      expect(ok.data.sectionOrder.length).toBeGreaterThan(0);
    }
  });

  it('accepts skills with europass-bucket on a group', () => {
    const ok = SkillsSchema.safeParse({
      type: 'skill',
      name: 'skills', source: null, order: 0, lang: 'en',
      groups: [
        { name: 'Languages & Tools', items: ['TS', 'Rust'], level: null, 'europass-bucket': 'Digital' },
      ],
      body: '',
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.groups[0]!.europassBucket).toBe('Digital');
  });

  it('accepts language atom with CEFR levels', () => {
    const ok = LanguagesSchema.safeParse({
      type: 'language',
      name: 'languages', source: null, order: 0, lang: 'en',
      languages: [
        { code: 'sk', name: 'Slovak', level: 'native', detail: null },
        { code: 'en', name: 'English', level: 'C2', detail: null },
      ],
      body: '',
    });
    expect(ok.success).toBe(true);
  });

  it('accepts identity headline subtype', () => {
    const ok = IdentityHeadlineSchema.safeParse({
      type: 'identity', subtype: 'headline',
      name: 'headline', source: null, order: 0, lang: 'en',
      body: '0→1 deep-tech CTO',
    });
    expect(ok.success).toBe(true);
  });

  it('accepts award with YYYY date', () => {
    const ok = AwardSchema.safeParse({
      type: 'award',
      name: 'x', source: null, order: 0, lang: 'en',
      title: 'X', awarder: 'Y', date: '2024', url: null, body: '',
    });
    expect(ok.success).toBe(true);
  });
});
