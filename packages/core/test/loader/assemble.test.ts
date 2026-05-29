import { describe, expect, it } from 'vitest';
import { assemble } from '../../src/loader/assemble.js';
import type { AtomRaw } from '../../src/loader/atoms.js';
import type { VariantManifest } from '../../src/spec/model.js';

const manifest: VariantManifest = {
  type: 'variant',
  name: 'founder-cto',
  title: 'Founder-CTO',
  targetRole: 'CTO',
  sectionOrder: [
    'personal', 'identity', 'work-experience', 'project', 'skill',
    'education', 'community', 'open-source', 'award', 'publication', 'language',
  ],
  lang: 'en',
  sourceMaster: 'master-v02',
  outputTargets: [],
  summaryMode: 'summary',
  collapseOpenSource: false,
  body: '',
};

function atom(frontmatter: Record<string, unknown>, body = ''): AtomRaw {
  return { path: `/fake/${frontmatter['name']}.md`, frontmatter, body };
}

describe('assemble', () => {
  it('partitions atoms by type and sorts work-experience by period-start desc', () => {
    const atoms = [
      atom({
        type: 'work-experience', name: 'a', source: null, order: 0, lang: 'en', visibility: 'public',
        employer: 'A', position: 'CTO', 'period-start': '2020-01', 'period-end': '2022-12',
        location: 'X', url: null, skills: [], keywords: [], 'ref-projects': [],
        'team-size': null, 'report-line': null,
      }),
      atom({
        type: 'work-experience', name: 'b', source: null, order: 0, lang: 'en', visibility: 'public',
        employer: 'B', position: 'CTO', 'period-start': '2024-01', 'period-end': 'present',
        location: 'X', url: null, skills: [], keywords: [], 'ref-projects': [],
        'team-size': null, 'report-line': null,
      }),
    ];
    const r = assemble('/fake/root', manifest, atoms);
    expect(r.cv.workExperience.map((w) => w.name)).toEqual(['b', 'a']);
    expect(r.warnings).toHaveLength(0);
  });

  it('drops non-public atoms with a visibility warning', () => {
    const atoms = [
      atom({
        type: 'work-experience', name: 'nda', source: null, order: 0, lang: 'en', visibility: 'nda',
        employer: 'X', position: 'X', 'period-start': '2020-01', 'period-end': 'present',
        location: 'X', url: null, skills: [], keywords: [], 'ref-projects': [],
        'team-size': null, 'report-line': null,
      }),
    ];
    const r = assemble('/fake/root', manifest, atoms);
    expect(r.cv.workExperience).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]!.category).toBe('visibility');
  });

  it('drops schema-failing atoms with a schema warning', () => {
    const atoms = [
      atom({
        type: 'work-experience', name: 'broken', source: null, order: 0, lang: 'en', visibility: 'public',
        // position missing
        employer: 'X', 'period-start': '2020-01', 'period-end': 'present',
        location: 'X', url: null, skills: [], keywords: [], 'ref-projects': [],
        'team-size': null, 'report-line': null,
      }),
    ];
    const r = assemble('/fake/root', manifest, atoms);
    expect(r.cv.workExperience).toHaveLength(0);
    expect(r.warnings.some((w) => w.category === 'schema')).toBe(true);
  });

  it('pairs identity atoms by subtype', () => {
    const atoms = [
      atom({
        type: 'identity', subtype: 'headline', name: 'headline',
        source: null, order: 0, lang: 'en', visibility: 'public',
      }, 'Headline body'),
      atom({
        type: 'identity', subtype: 'about', name: 'about',
        source: null, order: 0, lang: 'en', visibility: 'public',
      }, 'About body'),
    ];
    const r = assemble('/fake/root', manifest, atoms);
    expect(r.cv.identity.headline?.body).toBe('Headline body');
    expect(r.cv.identity.about?.body).toBe('About body');
  });

  it('warns on multiple singleton atoms (skills)', () => {
    const skills = (name: string) => atom({
      type: 'skill', name, source: null, order: 0, lang: 'en', visibility: 'public',
      groups: [{ name: 'G', items: ['x'], level: null }],
    });
    const r = assemble('/fake/root', manifest, [skills('skills'), skills('skills-2')]);
    expect(r.cv.skills?.name).toBe('skills');
    expect(r.warnings.some((w) => w.category === 'multi-singleton')).toBe(true);
  });

  it('sorts projects by parent-experience then period-start desc', () => {
    const p = (name: string, parent: string | null, start: string) => atom({
      type: 'project', name, source: null, order: 0, lang: 'en', visibility: 'public',
      title: name, client: null, employer: 'E', 'parent-experience': parent,
      'period-start': start, 'period-end': null, location: null, sector: '',
      roles: [], tech: [], url: null, keywords: [],
    });
    const r = assemble('/fake/root', manifest, [
      p('p1', 'exp-b', '2024-01'),
      p('p2', 'exp-a', '2022-01'),
      p('p3', 'exp-a', '2023-01'),
      p('p4', null, '2020-01'),
    ]);
    // Group order: exp-a (2 projects), exp-b (1 project), null (1 project) — preserved by insertion of parents in atoms array.
    // Within each group: period-start desc.
    expect(r.cv.projects.map((x) => x.name)).toEqual(['p1', 'p3', 'p2', 'p4']);
  });

  it('strips HTML comments from bodies before storing', () => {
    const atoms = [
      atom({
        type: 'award', name: 'x', source: null, order: 0, lang: 'en', visibility: 'public',
        title: 'X', awarder: 'Y', date: '2024', url: null,
      }, '<!-- secret --> Kept.'),
    ];
    const r = assemble('/fake/root', manifest, atoms);
    expect(r.cv.awards[0]!.body).toBe(' Kept.');
  });
});
