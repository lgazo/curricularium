# Curricularium Rendering Engine Implementation Plan — Part 2

> Continues from `2026-05-29-curricularium-rendering-engine.md`. Same execution skill (subagent-driven-development or executing-plans). Steps use `- [ ]` syntax.

This part covers: B3–B6 (remaining output adapters + engine render entry), Phase C (server rewiring), Phase D (cleanup + smoke).

---

## Phase B — Output adapters (continued)

### Task B3: JSON Resume community theme wrappers

**Files:**
- Create: `packages/core/src/outputs/jsonresume/themes/community.ts`
- Modify: `packages/core/src/outputs/index.ts`
- Create: `packages/core/test/outputs/jsonresume-community.test.ts`

- [ ] **Step 1: Write failing test `packages/core/test/outputs/jsonresume-community.test.ts`**

```ts
import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { findTheme, findOutput } from '../../src/outputs/registry.js';
import type { SpecCV } from '../../src/spec/model.js';

function minimal(): SpecCV {
  return {
    variantRoot: '/r',
    variant: {
      type: 'variant', name: 'x', title: 'X', targetRole: 'X',
      sectionOrder: ['personal', 'identity'], lang: 'en', sourceMaster: '',
      outputTargets: [], summaryMode: 'summary', collapseOpenSource: false, body: '',
    },
    personal: {
      type: 'personal', name: 'p', source: null, order: 0, lang: 'en',
      fullName: 'Jane Doe', targetRole: 'CTO', email: 'j@x.com', phone: null,
      location: 'Bratislava, Slovakia', profiles: [], body: '',
    },
    identity: {
      headline: { type: 'identity', subtype: 'headline', name: 'h', source: null, order: 0, lang: 'en', body: 'CTO' },
      about: { type: 'identity', subtype: 'about', name: 'a', source: null, order: 0, lang: 'en', body: 'Senior.' },
    },
    workExperience: [], projects: [], education: [], community: [],
    openSource: [], awards: [], publications: [], skills: null, languages: null,
  };
}

describe('jsonresume community themes', () => {
  it('exposes elegant, kendall, flat, stackoverflow as themes', () => {
    const ids = findOutput('jsonresume')!.themes.map((t) => t.id).sort();
    expect(ids).toContain('elegant');
    expect(ids).toContain('kendall');
    expect(ids).toContain('flat');
    expect(ids).toContain('stackoverflow');
  });

  it('elegant theme renders HTML containing the candidate name', async () => {
    const t = findTheme('jsonresume', 'elegant')!;
    expect(t.contentType).toBe('text/html');
    expect(t.filenameExt).toBe('.html');
    const { bytes, warnings } = await t.render(minimal(), {});
    const html = new TextDecoder().decode(bytes);
    if (warnings.length === 0) {
      expect(html).toContain('Jane Doe');
    } else {
      // Theme failed at runtime — should have a render-mapping warning, not throw
      expect(warnings.some((w) => w.category === 'render-mapping')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm -F @curricularium/core test
```
Expected: FAIL — only `raw` theme registered under `jsonresume`.

- [ ] **Step 3: Implement `packages/core/src/outputs/jsonresume/themes/community.ts`**

```ts
import type { ThemeDef, ThemeRenderResult } from '../../registry.js';
import { specCvToJsonResume } from '../adapter.js';
import type { LoadWarning } from '../../../spec/model.js';

type CommunityThemeModule = {
  render: (resume: unknown) => string | Promise<string>;
};

async function loadCommunityTheme(pkg: string): Promise<CommunityThemeModule | null> {
  try {
    const mod = await import(pkg);
    if (typeof mod.render === 'function') return mod as CommunityThemeModule;
    if (mod.default && typeof mod.default.render === 'function') return mod.default as CommunityThemeModule;
  } catch {
    return null;
  }
  return null;
}

function makeCommunityTheme(id: string, label: string, pkg: string): ThemeDef {
  return {
    id,
    label,
    contentType: 'text/html',
    filenameExt: '.html',
    render: async (cv): Promise<ThemeRenderResult> => {
      const warnings: LoadWarning[] = [];
      const resume = specCvToJsonResume(cv);
      const mod = await loadCommunityTheme(pkg);
      if (!mod) {
        warnings.push({
          file: pkg, category: 'render-mapping',
          message: `community theme package "${pkg}" not loadable`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
      try {
        const html = await mod.render(resume);
        return { bytes: new TextEncoder().encode(html), warnings };
      } catch (err) {
        warnings.push({
          file: pkg, category: 'render-mapping',
          message: `community theme "${id}" render threw: ${(err as Error).message}`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
    },
  };
}

export const communityThemes: ThemeDef[] = [
  makeCommunityTheme('elegant', 'Elegant', 'jsonresume-theme-elegant'),
  makeCommunityTheme('kendall', 'Kendall', 'jsonresume-theme-kendall'),
  makeCommunityTheme('flat', 'Flat', 'jsonresume-theme-flat'),
  makeCommunityTheme('stackoverflow', 'Stack Overflow', 'jsonresume-theme-stackoverflow'),
];
```

- [ ] **Step 4: Update `packages/core/src/outputs/index.ts` to register community themes**

Replace the `jsonresume` registration block with:

```ts
import { rawTheme } from './jsonresume/themes/raw.js';
import { communityThemes } from './jsonresume/themes/community.js';

registerOutput({
  id: 'jsonresume',
  label: 'JSON Resume',
  autoWriteOnRender: false,
  themes: [rawTheme, ...communityThemes],
  defaultThemeId: 'raw',
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm -F @curricularium/core test
```
Expected: community-theme tests PASS. (`elegant` may PASS with HTML or fall through the warnings branch if the package isn't installed at test time; both branches are accepted by the test.)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/outputs/jsonresume/themes/community.ts packages/core/src/outputs/index.ts packages/core/test/outputs/jsonresume-community.test.ts
git commit -m "feat(core): JSON Resume community theme wrappers (elegant, kendall, flat, stackoverflow)"
```

---

### Task B4: Europass canonical XML theme + adapter

**Files:**
- Create: `packages/core/src/outputs/europass/adapter.ts`
- Create: `packages/core/src/outputs/europass/themes/canonical.ts`
- Modify: `packages/core/src/outputs/index.ts`
- Create: `packages/core/test/outputs/europass.test.ts`

- [ ] **Step 1: Write failing test `packages/core/test/outputs/europass.test.ts`**

```ts
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
    expect(xml).toContain('Jane Doe');
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
```

- [ ] **Step 2: Implement `packages/core/src/outputs/europass/adapter.ts`**

```ts
import type { SkillGroup, SpecCV } from '../../spec/model.js';
import { formatDateEuropass, type EuropassDate } from '../../spec/canonical.js';

export type EuropassBucket = 'JobRelated' | 'Digital' | 'Communication' | 'Organisational';

export function resolveEuropassBucket(g: SkillGroup): EuropassBucket {
  if (g.europassBucket) return g.europassBucket;
  const lower = g.name.toLowerCase();
  if (lower.includes('digital')) return 'Digital';
  if (lower.includes('communication')) return 'Communication';
  if (lower.includes('organisational') || lower.includes('organizational')) return 'Organisational';
  return 'JobRelated';
}

export function buildEuropassXml(cv: SpecCV): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<EuropassCV xmlns="http://europass.cedefop.europa.eu/Europass" Locale="en">');

  if (cv.personal) {
    lines.push('  <Identification>');
    lines.push(`    <PersonName><FirstName>${esc(cv.personal.fullName.split(' ')[0] ?? '')}</FirstName><Surname>${esc(cv.personal.fullName.split(' ').slice(1).join(' '))}</Surname></PersonName>`);
    lines.push('    <ContactInfo>');
    const [city, country] = splitLoc(cv.personal.location);
    lines.push(`      <Address><Contact><AddressLine>${esc(city)}</AddressLine><Country><Label>${esc(country)}</Label></Country></Contact></Address>`);
    lines.push(`      <Email><Contact>${esc(cv.personal.email)}</Contact></Email>`);
    if (cv.personal.phone) {
      lines.push(`      <Telephone><Contact>${esc(cv.personal.phone)}</Contact></Telephone>`);
    }
    lines.push('    </ContactInfo>');
    lines.push('  </Identification>');
  }

  if (cv.identity.headline) {
    lines.push('  <Headline>');
    lines.push(`    <Description><Label>${esc(cv.identity.headline.body.trim())}</Label></Description>`);
    lines.push('  </Headline>');
  }

  if (cv.identity.about) {
    lines.push(`  <PersonalDescription><Label>${esc(cv.identity.about.body.trim())}</Label></PersonalDescription>`);
  }

  for (const w of cv.workExperience) {
    lines.push('  <WorkExperience>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(w.periodStart), formatDateEuropass(w.periodEnd))}</Period>`);
    lines.push(`    <Position><Label>${esc(w.position)}</Label></Position>`);
    lines.push(`    <Employer><Name>${esc(w.employer)}</Name></Employer>`);
    lines.push(`    <Activities><Label>${esc(w.body.trim())}</Label></Activities>`);
    lines.push('  </WorkExperience>');
  }

  for (const c of cv.community) {
    lines.push('  <WorkExperience>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(c.periodStart), formatDateEuropass(c.periodEnd))}</Period>`);
    lines.push(`    <Position><Label>${esc(c.role)}</Label></Position>`);
    lines.push(`    <Employer><Name>${esc(c.organisation)}</Name></Employer>`);
    lines.push(`    <Activities><Label>${esc(c.body.trim())}</Label></Activities>`);
    lines.push('    <Volunteer>true</Volunteer>');
    lines.push('  </WorkExperience>');
  }

  for (const o of cv.openSource) {
    lines.push('  <WorkExperience>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(o.periodStart), formatDateEuropass(o.periodEnd))}</Period>`);
    lines.push(`    <Position><Label>${esc(o.role)}</Label></Position>`);
    lines.push(`    <Employer><Name>${esc(o.title)}</Name><ContactInfo><Website><Contact>${esc(o.repoUrl)}</Contact></Website></ContactInfo></Employer>`);
    lines.push(`    <Activities><Label>${esc(o.body.trim())}</Label></Activities>`);
    lines.push('    <Volunteer>true</Volunteer>');
    lines.push('  </WorkExperience>');
  }

  for (const e of cv.education) {
    lines.push('  <Education>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(e.periodStart), formatDateEuropass(e.periodEnd))}</Period>`);
    lines.push(`    <Title><Label>${esc(e.degree)}</Label></Title>`);
    lines.push(`    <Organisation><Name>${esc(e.institution)}</Name></Organisation>`);
    if (e.field) lines.push(`    <Subjects><Label>${esc(e.field)}</Label></Subjects>`);
    lines.push('  </Education>');
  }

  if (cv.skills && cv.skills.groups.length > 0) {
    const buckets: Record<EuropassBucket, string[]> = {
      JobRelated: [], Digital: [], Communication: [], Organisational: [],
    };
    for (const g of cv.skills.groups) {
      buckets[resolveEuropassBucket(g)].push(`${g.name}: ${g.items.join(', ')}`);
    }
    lines.push('  <Skills>');
    for (const bucket of ['JobRelated', 'Digital', 'Communication', 'Organisational'] as EuropassBucket[]) {
      if (buckets[bucket].length === 0) continue;
      lines.push(`    <${bucket}><Description><Label>${esc(buckets[bucket].join('. '))}</Label></Description></${bucket}>`);
    }
    if (cv.languages) {
      lines.push('    <Linguistic>');
      for (const l of cv.languages.languages) {
        if (l.level === 'native') {
          lines.push(`      <MotherTongue><Description><Label>${esc(l.name)}</Label></Description></MotherTongue>`);
        } else {
          lines.push('      <ForeignLanguage>');
          lines.push(`        <Description><Label>${esc(l.name)}</Label></Description>`);
          lines.push(`        <ProficiencyLevel><Listening>${esc(l.level)}</Listening><Reading>${esc(l.level)}</Reading><SpokenInteraction>${esc(l.level)}</SpokenInteraction><SpokenProduction>${esc(l.level)}</SpokenProduction><Writing>${esc(l.level)}</Writing></ProficiencyLevel>`);
          lines.push('      </ForeignLanguage>');
        }
      }
      lines.push('    </Linguistic>');
    }
    lines.push('  </Skills>');
  }

  for (const a of cv.awards) {
    lines.push(`  <Honour><Date>${dateOnly(formatDateEuropass(a.date))}</Date><Title><Label>${esc(a.title)}</Label></Title><AwardingBody><Label>${esc(a.awarder)}</Label></AwardingBody></Honour>`);
  }

  for (const p of cv.publications) {
    lines.push(`  <Publication><Date>${dateOnly(formatDateEuropass(p.date))}</Date><Title><Label>${esc(p.title)}</Label></Title><Publisher><Label>${esc(p.publisher)}</Label></Publisher></Publication>`);
  }

  lines.push('</EuropassCV>');
  return lines.join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function splitLoc(s: string): [string, string] {
  const i = s.indexOf(',');
  if (i < 0) return [s.trim(), ''];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

function periodXml(from: EuropassDate, to: EuropassDate): string {
  const parts: string[] = [];
  parts.push(`<From>${'current' in from ? '<Year>0</Year>' : dateOnly(from)}</From>`);
  parts.push(`<To>${'current' in to ? '<Current>true</Current>' : dateOnly(to)}</To>`);
  return parts.join('');
}

function dateOnly(d: EuropassDate): string {
  if ('current' in d) return '<Current>true</Current>';
  const parts: string[] = [];
  parts.push(`<Year>${esc(d.year)}</Year>`);
  if (d.month) parts.push(`<Month>${esc(d.month)}</Month>`);
  return parts.join('');
}
```

- [ ] **Step 3: Implement `packages/core/src/outputs/europass/themes/canonical.ts`**

```ts
import type { ThemeDef } from '../../registry.js';
import { buildEuropassXml } from '../adapter.js';

export const canonicalTheme: ThemeDef = {
  id: 'canonical',
  label: 'Canonical Europass XML',
  contentType: 'application/xml',
  filenameExt: '.xml',
  render: async (cv) => {
    const xml = buildEuropassXml(cv);
    return { bytes: new TextEncoder().encode(xml + '\n'), warnings: [] };
  },
};
```

- [ ] **Step 4: Update `packages/core/src/outputs/index.ts` Europass registration**

Replace the `europass` registration block with:

```ts
import { canonicalTheme } from './europass/themes/canonical.js';

registerOutput({
  id: 'europass',
  label: 'Europass XML',
  autoWriteOnRender: false,
  themes: [canonicalTheme],
  defaultThemeId: 'canonical',
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: europass adapter + canonical theme tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/outputs/europass/ packages/core/src/outputs/index.ts packages/core/test/outputs/europass.test.ts
git commit -m "feat(core): Europass canonical XML theme with bucket resolution and CEFR"
```

---

### Task B5: HTML `linkedin-spiritual` theme (move and reshape existing JSX)

**Files:**
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/CV.tsx`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/Sidebar.tsx`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/Main.tsx`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/ExperienceItem.tsx`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/EducationItem.tsx`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/ProjectItem.tsx`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/index.ts` (theme export)
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/styles.css`
- Create: `packages/core/src/outputs/html/themes/linkedin-spiritual/markdown.ts`
- Modify: `packages/core/src/outputs/index.ts`
- Modify: `packages/core/package.json` (add `hono` as a dep, since JSX uses `hono/jsx`)
- Create: `packages/core/test/outputs/html.test.ts`

- [ ] **Step 1: Add hono to core deps**

Edit `packages/core/package.json` and add to `dependencies`:

```json
"hono": "^4.6.0"
```

Run:
```bash
pnpm install
```

- [ ] **Step 2: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/markdown.ts`**

```ts
import { Marked } from 'marked';

const md = new Marked({ gfm: true, breaks: false });

export function renderMarkdown(body: string): string {
  return md.parse(body) as string;
}

export function splitBulletList(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const bullets: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) bullets.push(renderMarkdown(text));
    buffer = [];
  };
  for (const line of lines) {
    const m = /^\s*[-*]\s+(.*)$/.exec(line);
    if (m) {
      flush();
      bullets.push(renderMarkdown(m[1]!));
    } else {
      buffer.push(line);
    }
  }
  flush();
  return bullets;
}
```

- [ ] **Step 3: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/Sidebar.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { Personal, Skills } from '../../../../spec/model.js';

type Props = { personal: Personal | null; skills: Skills | null; headline: string | null };

export const Sidebar: FC<Props> = ({ personal, skills, headline }) => {
  if (!personal) return <aside class="cv-sidebar" />;
  return (
    <aside class="cv-sidebar">
      <h1 class="cv-name">{personal.fullName}</h1>
      {headline ? <p class="cv-headline">{headline}</p> : null}
      <p class="cv-location">{personal.location}</p>

      <section class="cv-contact">
        <h2 class="cv-section-label">Contact</h2>
        <ul>
          <li><a href={`mailto:${personal.email}`}>{personal.email}</a></li>
          {personal.phone ? <li>{personal.phone}</li> : null}
          {personal.profiles.map((p) => (
            <li><a href={p.url}>{p.network}{p.username ? `: ${p.username}` : ''}</a></li>
          ))}
        </ul>
      </section>

      {skills && skills.groups.length > 0 ? (
        <section class="cv-skills">
          <h2 class="cv-section-label">Skills</h2>
          {skills.groups.map((group) => (
            <div class="cv-skill-group">
              <h3 class="cv-skill-group-name">{group.name}</h3>
              <ul class="cv-chips">
                {group.items.map((item) => (<li class="cv-chip">{item}</li>))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
  );
};
```

- [ ] **Step 4: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/ExperienceItem.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { WorkExperience } from '../../../../spec/model.js';
import { formatDateMMYYYY } from '../../../../spec/canonical.js';
import { renderMarkdown, splitBulletList } from './markdown.js';

export const ExperienceItem: FC<{ entry: WorkExperience }> = ({ entry }) => {
  const bullets = splitBulletList(entry.body);
  return (
    <article class="cv-experience-item">
      <header>
        <h3 class="cv-role">{entry.position}</h3>
        <p class="cv-company">
          {entry.employer}
          <span class="cv-location-inline"> · {entry.location}</span>
        </p>
        <p class="cv-dates">
          {formatDateMMYYYY(entry.periodStart)} – {formatDateMMYYYY(entry.periodEnd)}
        </p>
      </header>
      {bullets.length > 0 ? (
        <ul class="cv-bullets">
          {bullets.map((html) => (<li dangerouslySetInnerHTML={{ __html: html }} />))}
        </ul>
      ) : null}
    </article>
  );
};
```

- [ ] **Step 5: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/EducationItem.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { Education } from '../../../../spec/model.js';
import { formatDateMMYYYY } from '../../../../spec/canonical.js';
import { renderMarkdown } from './markdown.js';

export const EducationItem: FC<{ entry: Education }> = ({ entry }) => (
  <article class="cv-education-item">
    <header>
      <h3 class="cv-degree">
        {entry.degree}
        {entry.field ? <span> · {entry.field}</span> : null}
      </h3>
      <p class="cv-school">{entry.institution} · {entry.location}</p>
      <p class="cv-dates">
        {formatDateMMYYYY(entry.periodStart)} – {formatDateMMYYYY(entry.periodEnd)}
      </p>
    </header>
    {entry.body ? <div class="cv-notes" dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.body) }} /> : null}
  </article>
);
```

- [ ] **Step 6: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/ProjectItem.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { Project } from '../../../../spec/model.js';
import { formatDateMMYYYY } from '../../../../spec/canonical.js';
import { renderMarkdown, splitBulletList } from './markdown.js';

export const ProjectItem: FC<{ entry: Project }> = ({ entry }) => {
  const bullets = splitBulletList(entry.body);
  const end = entry.periodEnd ? formatDateMMYYYY(entry.periodEnd) : 'Present';
  return (
    <article class="cv-experience-item">
      <header>
        <h3 class="cv-role">{entry.title}</h3>
        <p class="cv-company">
          {entry.employer}
          {entry.client ? <span class="cv-location-inline"> · {entry.client}</span> : null}
          {entry.location ? <span class="cv-location-inline"> · {entry.location}</span> : null}
        </p>
        <p class="cv-dates">{formatDateMMYYYY(entry.periodStart)} – {end}</p>
      </header>
      {bullets.length > 0 ? (
        <ul class="cv-bullets">
          {bullets.map((html) => (<li dangerouslySetInnerHTML={{ __html: html }} />))}
        </ul>
      ) : null}
    </article>
  );
};
```

- [ ] **Step 7: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/Main.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { SpecCV } from '../../../../spec/model.js';
import { SECTION_HEADINGS, summaryHeading } from '../../../../spec/canonical.js';
import { renderMarkdown } from './markdown.js';
import { ExperienceItem } from './ExperienceItem.js';
import { EducationItem } from './EducationItem.js';
import { ProjectItem } from './ProjectItem.js';

export const Main: FC<{ cv: SpecCV }> = ({ cv }) => {
  const order = cv.variant.sectionOrder.filter((s) => s !== 'personal');

  return (
    <main class="cv-main">
      {order.map((section) => {
        switch (section) {
          case 'identity':
            if (!cv.identity.about) return null;
            return (
              <section class="cv-about">
                <h2 class="cv-section-title">{summaryHeading(cv.variant.summaryMode)}</h2>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(cv.identity.about.body) }} />
              </section>
            );
          case 'work-experience':
            if (cv.workExperience.length === 0) return null;
            return (
              <section class="cv-experience">
                <h2 class="cv-section-title">{SECTION_HEADINGS['work-experience']}</h2>
                {cv.workExperience.map((e) => <ExperienceItem entry={e} />)}
              </section>
            );
          case 'project':
            const projects = cv.variant.collapseOpenSource
              ? [...cv.projects]
              : cv.projects;
            if (projects.length === 0) return null;
            return (
              <section class="cv-projects">
                <h2 class="cv-section-title">{SECTION_HEADINGS['project']}</h2>
                {projects.map((e) => <ProjectItem entry={e} />)}
              </section>
            );
          case 'education':
            if (cv.education.length === 0) return null;
            return (
              <section class="cv-education">
                <h2 class="cv-section-title">{SECTION_HEADINGS['education']}</h2>
                {cv.education.map((e) => <EducationItem entry={e} />)}
              </section>
            );
          case 'community':
            if (cv.community.length === 0) return null;
            return (
              <section class="cv-community">
                <h2 class="cv-section-title">{SECTION_HEADINGS['community']}</h2>
                {cv.community.map((c) => (
                  <article class="cv-experience-item">
                    <header>
                      <h3 class="cv-role">{c.role}</h3>
                      <p class="cv-company">{c.organisation}</p>
                    </header>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }} />
                  </article>
                ))}
              </section>
            );
          case 'open-source':
            if (cv.variant.collapseOpenSource || cv.openSource.length === 0) return null;
            return (
              <section class="cv-opensource">
                <h2 class="cv-section-title">{SECTION_HEADINGS['open-source']}</h2>
                {cv.openSource.map((o) => (
                  <article class="cv-experience-item">
                    <header>
                      <h3 class="cv-role">{o.title}</h3>
                      <p class="cv-company"><a href={o.repoUrl}>{o.repoUrl}</a> · {o.role}</p>
                    </header>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(o.body) }} />
                  </article>
                ))}
              </section>
            );
          case 'award':
            if (cv.awards.length === 0) return null;
            return (
              <section class="cv-awards">
                <h2 class="cv-section-title">{SECTION_HEADINGS['award']}</h2>
                <ul>{cv.awards.map((a) => <li><strong>{a.title}</strong> · {a.awarder} · {a.date}</li>)}</ul>
              </section>
            );
          case 'publication':
            if (cv.publications.length === 0) return null;
            return (
              <section class="cv-publications">
                <h2 class="cv-section-title">{SECTION_HEADINGS['publication']}</h2>
                <ul>{cv.publications.map((p) => <li><strong>{p.title}</strong> · {p.publisher} · {p.date}</li>)}</ul>
              </section>
            );
          case 'language':
            if (!cv.languages || cv.languages.languages.length === 0) return null;
            return (
              <section class="cv-languages">
                <h2 class="cv-section-title">{SECTION_HEADINGS['language']}</h2>
                <ul>{cv.languages.languages.map((l) => <li>{l.name} · {l.level}</li>)}</ul>
              </section>
            );
          case 'skill':
          case 'personal':
          default:
            return null;  // skills handled in Sidebar; personal handled above name
        }
      })}
    </main>
  );
};
```

- [ ] **Step 8: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/CV.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { SpecCV } from '../../../../spec/model.js';
import { Sidebar } from './Sidebar.js';
import { Main } from './Main.js';

export const CV: FC<{ cv: SpecCV }> = ({ cv }) => (
  <div class="cv-page">
    <Sidebar
      personal={cv.personal}
      skills={cv.skills}
      headline={cv.identity.headline?.body.trim() ?? null}
    />
    <Main cv={cv} />
  </div>
);
```

- [ ] **Step 9: Copy CSS to `packages/core/src/outputs/html/themes/linkedin-spiritual/styles.css`**

Copy the `.cv-*` rules (lines 57–115) from `packages/server/src/static/styles.css` verbatim into this file. Leave the `.shell-*` and `#source-list` rules in place inside `packages/server/src/static/styles.css` — those belong to the server shell, not the theme.

- [ ] **Step 10: Implement `packages/core/src/outputs/html/themes/linkedin-spiritual/index.ts`**

```ts
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ThemeDef } from '../../../registry.js';
import { CV } from './CV.js';

const here = dirname(fileURLToPath(import.meta.url));

export const linkedinSpiritualTheme: ThemeDef = {
  id: 'linkedin-spiritual',
  label: 'LinkedIn Spiritual',
  contentType: 'text/html',
  filenameExt: '.html',
  render: async (cv) => {
    const css = await readFile(join(here, 'styles.css'), 'utf8');
    const body = (<CV cv={cv as any} />).toString();
    const html = `<!DOCTYPE html>
<html lang="${cv.variant.lang}">
<head>
  <meta charset="utf-8" />
  <title>${cv.personal?.fullName ?? cv.variant.title} — CV</title>
  <style>${css}</style>
</head>
<body>${body}</body>
</html>`;
    return { bytes: new TextEncoder().encode(html), warnings: [] };
  },
};
```

- [ ] **Step 11: Update `packages/core/src/outputs/index.ts` HTML registration**

Replace the `html` registration block with:

```ts
import { linkedinSpiritualTheme } from './html/themes/linkedin-spiritual/index.js';

registerOutput({
  id: 'html',
  label: 'HTML',
  autoWriteOnRender: true,
  themes: [linkedinSpiritualTheme],
  defaultThemeId: 'linkedin-spiritual',
});
```

- [ ] **Step 12: Write smoke test `packages/core/test/outputs/html.test.ts`**

```ts
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
      location: 'Bratislava, Slovakia', profiles: [], body: '',
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
```

- [ ] **Step 13: Run tests and typecheck**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: html smoke test PASS. tsc no output.

- [ ] **Step 14: Commit**

```bash
git add packages/core/src/outputs/html/ packages/core/src/outputs/index.ts packages/core/package.json packages/core/test/outputs/html.test.ts pnpm-lock.yaml
git commit -m "feat(core): HTML linkedin-spiritual theme consuming SpecCV"
```

---

### Task B6: `render()` entry point and core public API

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/src/render.ts`
- Create: `packages/core/test/render.test.ts`

- [ ] **Step 1: Write failing test `packages/core/test/render.test.ts`**

```ts
import '../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVariant, render } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, 'fixtures', 'variants', 'minimal');

describe('render entry', () => {
  it('renders the minimal fixture as JSON Resume raw', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    const r = await render({ cv: lr.cv, outputId: 'jsonresume', themeId: 'raw' });
    expect(r.contentType).toBe('application/json');
    expect(r.filename).toBe('minimal-jsonresume.json');
    const json = JSON.parse(new TextDecoder().decode(r.bytes));
    expect(json.basics.name).toBe('Jane Doe');
  });

  it('renders the minimal fixture as Europass canonical XML', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    const r = await render({ cv: lr.cv, outputId: 'europass', themeId: 'canonical' });
    expect(r.contentType).toBe('application/xml');
    expect(r.filename).toBe('minimal-europass.xml');
    expect(new TextDecoder().decode(r.bytes)).toContain('<EuropassCV');
  });

  it('appends -theme suffix when output has multiple themes', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    const r = await render({ cv: lr.cv, outputId: 'jsonresume', themeId: 'elegant' });
    expect(r.filename).toBe('minimal-jsonresume-elegant.html');
  });

  it('throws UnknownOutput for an unknown outputId', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    await expect(render({ cv: lr.cv, outputId: 'nope', themeId: 'x' })).rejects.toThrow(/UnknownOutput/);
  });
});
```

- [ ] **Step 2: Implement `packages/core/src/render.ts`**

```ts
import './outputs/index.js';  // ensure registry side-effects
import type { LoadWarning, SpecCV } from './spec/model.js';
import { findOutput, findTheme } from './outputs/registry.js';

export type RenderArgs = {
  cv: SpecCV;
  outputId: string;
  themeId: string;
  opts?: unknown;
};

export type RenderResult = {
  contentType: string;
  filename: string;
  bytes: Uint8Array;
  warnings: LoadWarning[];
};

export class UnknownOutput extends Error {
  constructor(id: string) { super(`UnknownOutput: ${id}`); }
}
export class UnknownTheme extends Error {
  constructor(outputId: string, themeId: string) { super(`UnknownTheme: ${outputId}/${themeId}`); }
}

export async function render(args: RenderArgs): Promise<RenderResult> {
  const output = findOutput(args.outputId);
  if (!output) throw new UnknownOutput(args.outputId);
  const theme = findTheme(args.outputId, args.themeId);
  if (!theme) throw new UnknownTheme(args.outputId, args.themeId);

  const { bytes, warnings } = await theme.render(args.cv, args.opts);
  const includeTheme = output.themes.length > 1;
  const suffix = includeTheme ? `-${theme.id}` : '';
  const filename = `${args.cv.variant.name}-${output.id}${suffix}${theme.filenameExt}`;
  return { contentType: theme.contentType, filename, bytes, warnings };
}
```

- [ ] **Step 3: Replace `packages/core/src/index.ts` with the public API surface**

```ts
import './outputs/index.js';
export { discoverVariants } from './loader/discover.js';
export type { VariantSummary } from './loader/discover.js';
export { loadVariant } from './loader/index.js';
export type { LoadResult } from './loader/index.js';
export { render, UnknownOutput, UnknownTheme } from './render.js';
export type { RenderArgs, RenderResult } from './render.js';
export { listOutputs, findOutput, findTheme } from './outputs/registry.js';
export type { OutputDef, ThemeDef, ThemeRenderResult } from './outputs/registry.js';
export type { LoadWarning, SpecCV, VariantManifest, SectionType, WarningCategory } from './spec/model.js';
export { SECTION_HEADINGS, DEFAULT_SECTION_ORDER, formatDateMMYYYY, summaryHeading } from './spec/canonical.js';
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: render tests PASS. All earlier tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/render.ts packages/core/src/index.ts packages/core/test/render.test.ts
git commit -m "feat(core): render() entry and public API surface"
```

---

## Phase C — Server rewiring

### Task C1: Extend config with outputDir, autoWrite, active selectors

**Files:**
- Modify: `packages/server/src/config.ts`

- [ ] **Step 1: Replace `packages/server/src/config.ts`**

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';

export const AutoWriteSchema = z.object({
  html: z.boolean().default(true),
  jsonresume: z.boolean().default(false),
  europass: z.boolean().default(false),
}).default({ html: true, jsonresume: false, europass: false });

export const SourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  outputDir: z.string().nullable().default(null),
  autoWrite: AutoWriteSchema,
  bannedStrings: z.array(z.string()).default([]),
  addedAt: z.string(),
});

export const ConfigSchema = z.object({
  sources: z.array(SourceSchema).default([]),
  activeSourceId: z.string().nullable().default(null),
  activeVariantName: z.string().nullable().default(null),
  activeOutputId: z.string().nullable().default(null),
  activeThemeId: z.string().nullable().default(null),
});

export type Source = z.infer<typeof SourceSchema>;
export type AutoWrite = z.infer<typeof AutoWriteSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export function configFilePath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.config');
  return join(base, 'curricularium', 'config.json');
}

const EMPTY: Config = {
  sources: [], activeSourceId: null, activeVariantName: null,
  activeOutputId: null, activeThemeId: null,
};

export async function loadConfig(): Promise<Config> {
  const path = configFilePath();
  if (!existsSync(path)) return EMPTY;
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return EMPTY; }
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) return EMPTY;
  return result.data;
}

export async function saveConfig(config: Config): Promise<void> {
  const path = configFilePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function defaultOutputDir(sourcePath: string): string {
  return join(dirname(sourcePath), '_out');
}
```

- [ ] **Step 2: Update `packages/server/src/sources.ts`**

The new sources need `outputDir`, `autoWrite`, and `bannedStrings` defaults at add time. Replace the `addSource` body in `packages/server/src/sources.ts`:

```ts
import { defaultOutputDir, /* keep existing imports */ } from './config.js';
// ...
const source: Source = {
  id: ulid(),
  name,
  path,
  outputDir: null,
  autoWrite: { html: true, jsonresume: false, europass: false },
  bannedStrings: [],
  addedAt: new Date().toISOString(),
};
```

Also drop the `profile.md` existence requirement from `validateSourcePath` (the new model points at a publish root, not a file containing profile.md). Replace `validateSourcePath` with:

```ts
function validateSourcePath(path: string): string | null {
  if (!existsSync(path)) return 'path does not exist';
  let stats;
  try { stats = statSync(path); } catch (err) {
    return `cannot stat path: ${(err as Error).message}`;
  }
  if (!stats.isDirectory()) return 'path is not a directory';
  try { accessSync(path, constants.R_OK); } catch { return 'path is not readable'; }
  return null;
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/config.ts packages/server/src/sources.ts
git commit -m "feat(server): extend config with outputDir, autoWrite, active selectors"
```

---

### Task C2: Narrow watcher scope to active variant

**Files:**
- Modify: `packages/server/src/watcher.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Replace `packages/server/src/watcher.ts`**

```ts
import chokidar, { type FSWatcher } from 'chokidar';
import { broadcast } from './sse.js';
import { loadVariant } from '@curricularium/core';

let active: FSWatcher | null = null;
let activePath: string | null = null;
let activeIdentity: { variant: string; output: string; theme: string } | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function setActiveIdentity(id: { variant: string; output: string; theme: string }): void {
  activeIdentity = id;
}

export function startWatching(variantRoot: string): void {
  if (active && activePath === variantRoot) return;
  stopWatching();
  activePath = variantRoot;
  active = chokidar.watch(variantRoot, {
    ignored: /(^|[\\/])\../,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 25 },
  });
  const fire = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!activePath) return;
      const result = await loadVariant(activePath);
      if (result.ok) {
        broadcast({
          event: 'reload',
          data: activeIdentity ?? { variant: '', output: '', theme: '' },
        });
      } else {
        const first = result.errors[0];
        broadcast({
          event: 'parse-error',
          data: { message: first?.message ?? 'load failed', file: first?.file },
        });
      }
    }, 150);
  };
  active.on('add', fire);
  active.on('change', fire);
  active.on('unlink', fire);
  active.on('error', (err) => {
    console.error('[watcher] error:', err);
  });
}

export function stopWatching(): void {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (active) { void active.close(); active = null; }
  activePath = null;
}
```

- [ ] **Step 2: Update `packages/server/src/index.ts` reattach helper**

Replace `reattachWatcher`:

```ts
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { buildApp } from './routes/index.js';
import { getActiveSource } from './sources.js';
import { loadConfig } from './config.js';
import { setActiveIdentity, startWatching, stopWatching } from './watcher.js';

const port = Number(process.env.PORT ?? 3000);

async function reattachWatcher(): Promise<void> {
  const active = await getActiveSource();
  const config = await loadConfig();
  if (!active || !config.activeVariantName) {
    stopWatching();
    return;
  }
  setActiveIdentity({
    variant: config.activeVariantName,
    output: config.activeOutputId ?? 'html',
    theme: config.activeThemeId ?? 'linkedin-spiritual',
  });
  startWatching(join(active.path, config.activeVariantName));
}

await reattachWatcher();

const app = buildApp();
const watch = setInterval(reattachWatcher, 2000);

const server = serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`curricularium listening on http://localhost:${port}`);
});

const shutdown = () => {
  clearInterval(watch);
  stopWatching();
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

- [ ] **Step 3: Add `@curricularium/core` dep to server**

Edit `packages/server/package.json` and add to `dependencies`:

```json
"@curricularium/core": "workspace:*"
```

Run:
```bash
pnpm install
```

- [ ] **Step 4: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/watcher.ts packages/server/src/index.ts packages/server/package.json pnpm-lock.yaml
git commit -m "feat(server): narrow watcher to active variant, wire @curricularium/core"
```

---

### Task C3: SSE event shape + Layout client update

**Files:**
- Modify: `packages/server/src/sse.ts`
- Modify: `packages/server/src/render/Layout.tsx`

- [ ] **Step 1: Replace `packages/server/src/sse.ts`**

```ts
export type SSEEvent =
  | { event: 'reload'; data: { variant: string; output: string; theme: string } }
  | { event: 'warnings'; data: { count: number; html: string } }
  | { event: 'parse-error'; data: { message: string; file?: string } };

type Client = { send: (event: SSEEvent) => void | Promise<void> };

const clients = new Set<Client>();

export function addClient(client: Client): () => void {
  clients.add(client);
  return () => clients.delete(client);
}

export function broadcast(message: SSEEvent): void {
  for (const client of clients) {
    try { void client.send(message); } catch { clients.delete(client); }
  }
}

export function clientCount(): number { return clients.size; }
```

- [ ] **Step 2: Replace the SSE client snippet in `packages/server/src/render/Layout.tsx`**

Replace the `__html` block of the existing `<script>` (the one rendered when `sseClient` is true) with:

```js
const params = new URLSearchParams(location.search);
const me = {
  variant: params.get('variant') || '',
  output: params.get('output') || '',
  theme: params.get('theme') || '',
};
const es = new EventSource('/events');
es.addEventListener('reload', (e) => {
  try {
    const d = JSON.parse(e.data || '{}');
    if (!me.variant || (d.variant === me.variant && d.output === me.output && d.theme === me.theme)) {
      location.reload();
    }
  } catch { location.reload(); }
});
es.addEventListener('warnings', (e) => {
  try {
    const d = JSON.parse(e.data || '{}');
    const target = document.getElementById('warnings-banner');
    if (target) target.outerHTML = d.html || '';
  } catch {}
});
es.addEventListener('parse-error', (e) => {
  const data = JSON.parse(e.data || '{}');
  let banner = document.getElementById('parse-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'parse-error-banner';
    banner.className = 'cv-error-banner';
    banner.setAttribute('role', 'alert');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.zIndex = '9999';
    document.body.prepend(banner);
  }
  banner.replaceChildren();
  const title = document.createElement('p');
  title.className = 'cv-error-title';
  title.textContent = 'Parse error';
  banner.appendChild(title);
  const body = document.createElement('p');
  if (data.file) {
    const code = document.createElement('code');
    code.textContent = data.file;
    body.appendChild(code);
    body.appendChild(document.createTextNode(' — '));
  }
  body.appendChild(document.createTextNode(data.message || 'unknown error'));
  banner.appendChild(body);
});
es.addEventListener('error', () => {});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/sse.ts packages/server/src/render/Layout.tsx
git commit -m "feat(server): SSE events carry variant/output/theme identity + warnings OOB"
```

---

### Task C4: WarningsBanner + remove ErrorBanner

**Files:**
- Create: `packages/server/src/render/WarningsBanner.tsx`
- Delete: `packages/server/src/render/ErrorBanner.tsx`
- Modify: `packages/server/src/render/Shell.tsx` (use WarningsBanner)

- [ ] **Step 1: Create `packages/server/src/render/WarningsBanner.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { LoadWarning } from '@curricularium/core';

export const WarningsBanner: FC<{ warnings: LoadWarning[] }> = ({ warnings }) => {
  if (warnings.length === 0) return <div id="warnings-banner" />;
  return (
    <details id="warnings-banner" class="cv-warnings-banner">
      <summary>{`Warnings (${warnings.length})`}</summary>
      <ul>
        {warnings.map((w) => (
          <li>
            <span class={`cv-warn cv-warn--${w.category}`}>{w.category}</span>{' '}
            <code>{w.file}</code>
            {w.field ? <span class="cv-warn-field"> · {w.field}</span> : null}
            <span class="cv-warn-message"> — {w.message}</span>
          </li>
        ))}
      </ul>
    </details>
  );
};
```

- [ ] **Step 2: Delete `packages/server/src/render/ErrorBanner.tsx`**

```bash
rm packages/server/src/render/ErrorBanner.tsx
```

- [ ] **Step 3: Add warning banner styles to `packages/server/src/static/styles.css`**

Append:

```css
.cv-warnings-banner { background: #fef3c7; color: #78350f; padding: 12px 20px; border-bottom: 2px solid #f59e0b; }
.cv-warnings-banner summary { font-weight: 700; cursor: pointer; }
.cv-warnings-banner ul { margin: 8px 0 0; padding-left: 18px; }
.cv-warn { display: inline-block; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.08); }
.cv-warn-field { color: #92400e; }
```

- [ ] **Step 4: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: errors only where ErrorBanner was imported. Continue to C5/C6/C7 — those replace the usages.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/render/WarningsBanner.tsx packages/server/src/static/styles.css
git rm packages/server/src/render/ErrorBanner.tsx
git commit -m "feat(server): WarningsBanner replaces ErrorBanner"
```

---

### Task C5: Update `/preview` route to consume core

**Files:**
- Modify: `packages/server/src/routes/preview.tsx`

- [ ] **Step 1: Replace `packages/server/src/routes/preview.tsx`**

```tsx
import { Hono } from 'hono';
import { join } from 'node:path';
import { Layout } from '../render/Layout.js';
import { WarningsBanner } from '../render/WarningsBanner.js';
import { getActiveSource, sourceAvailability } from '../sources.js';
import { loadConfig } from '../config.js';
import { loadVariant, render } from '@curricularium/core';

export const previewRoutes = new Hono();

previewRoutes.get('/preview', async (c) => {
  const source = await getActiveSource();
  const config = await loadConfig();
  if (!source) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">No active source.</div>
      </Layout>,
    );
  }
  if (sourceAvailability(source) !== 'ok') {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">Source unavailable: {source.path}</div>
      </Layout>,
    );
  }

  const variant = c.req.query('variant') ?? config.activeVariantName;
  const outputId = c.req.query('output') ?? config.activeOutputId ?? 'html';
  const themeId = c.req.query('theme') ?? config.activeThemeId ?? 'linkedin-spiritual';

  if (!variant) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">No active variant. Pick one in the shell.</div>
      </Layout>,
    );
  }

  const variantRoot = join(source.path, variant);
  const lr = await loadVariant(variantRoot);
  if (!lr.ok) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">
          <p class="cv-error-title">Variant not loadable</p>
          <ul>{lr.errors.map((e) => (<li><code>{e.file}</code> — {e.message}</li>))}</ul>
        </div>
      </Layout>,
    );
  }

  let rr;
  try {
    rr = await render({ cv: lr.cv, outputId, themeId });
  } catch (err) {
    return c.html(
      <Layout title="Preview" sseClient>
        <WarningsBanner warnings={lr.warnings} />
        <div class="cv-error-banner">Render failed: {(err as Error).message}</div>
      </Layout>,
    );
  }

  // HTML output: return raw body (the theme already produced a full document).
  if (rr.contentType.startsWith('text/html')) {
    const html = new TextDecoder().decode(rr.bytes);
    // Inject the SSE client + warnings banner via a small DOM trick:
    // wrap output in a Layout so it gets the SSE script + banner.
    return c.html(
      <Layout title={`${lr.cv.personal?.fullName ?? lr.cv.variant.title} — CV`} sseClient>
        <WarningsBanner warnings={[...lr.warnings, ...rr.warnings]} />
        <div dangerouslySetInnerHTML={{ __html: extractBody(html) }} />
      </Layout>,
    );
  }

  // JSON / XML: syntax-highlighted pre
  const text = new TextDecoder().decode(rr.bytes);
  return c.html(
    <Layout title={`${lr.cv.variant.title} — ${outputId}`} sseClient>
      <WarningsBanner warnings={[...lr.warnings, ...rr.warnings]} />
      <pre class="cv-output-text">{text}</pre>
    </Layout>,
  );
});

function extractBody(html: string): string {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return m ? m[1]! : html;
}
```

- [ ] **Step 2: Append output-text styles to `packages/server/src/static/styles.css`**

```css
.cv-output-text { white-space: pre-wrap; word-break: break-word; padding: 16px 20px; background: #0f172a; color: #e2e8f0; min-height: 100vh; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.5; }
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routes/preview.tsx packages/server/src/static/styles.css
git commit -m "feat(server): /preview reads variant/output/theme, drives core render"
```

---

### Task C6: Shell picker UI + /sources updates

**Files:**
- Modify: `packages/server/src/render/Shell.tsx`
- Modify: `packages/server/src/routes/shell.tsx`
- Modify: `packages/server/src/routes/sources.tsx`

- [ ] **Step 1: Replace `packages/server/src/render/Shell.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { Source } from '../config.js';
import type { VariantSummary, OutputDef } from '@curricularium/core';
import { WarningsBanner } from './WarningsBanner.js';
import type { LoadWarning } from '@curricularium/core';

type Props = {
  sources: Source[];
  activeSourceId: string | null;
  availability: Record<string, 'ok' | 'missing' | 'unreadable'>;
  addSourceError?: string;
  variants: VariantSummary[];
  outputs: OutputDef[];
  activeVariantName: string | null;
  activeOutputId: string | null;
  activeThemeId: string | null;
  outputDir: string | null;
  warnings: LoadWarning[];
  lastGenerated?: { variant: string; output: string; theme: string; path: string } | null;
};

export const Shell: FC<Props> = (p) => {
  const previewQS = p.activeVariantName
    ? `?variant=${encodeURIComponent(p.activeVariantName)}&output=${encodeURIComponent(p.activeOutputId ?? '')}&theme=${encodeURIComponent(p.activeThemeId ?? '')}`
    : '';
  const activeOutput = p.outputs.find((o) => o.id === p.activeOutputId) ?? p.outputs[0];
  return (
    <div class="shell">
      <header class="shell-header no-print">
        <h1 class="shell-title">Curricularium</h1>
        <button
          type="button"
          class="shell-print"
          onclick="document.getElementById('preview-frame').contentWindow.print()"
        >
          Print / Save PDF
        </button>
      </header>

      <aside class="shell-aside no-print">
        <section class="shell-sources">
          <h2>Sources</h2>
          <ul id="source-list">
            {p.sources.map((s) => (
              <li class={`source-row${s.id === p.activeSourceId ? ' source-row--active' : ''}`}>
                <span class={`source-status source-status--${p.availability[s.id] ?? 'ok'}`} />
                <div class="source-meta">
                  <strong>{s.name}</strong>
                  <code>{s.path}</code>
                </div>
                <div class="source-actions">
                  {p.availability[s.id] === 'ok' && s.id !== p.activeSourceId ? (
                    <button type="button" hx-post={`/sources/${s.id}/activate`} hx-target="body" hx-swap="outerHTML">Activate</button>
                  ) : null}
                  <button type="button" hx-delete={`/sources/${s.id}`} hx-target="body" hx-swap="outerHTML" hx-confirm="Remove this source?">Remove</button>
                </div>
              </li>
            ))}
          </ul>

          <form class="add-source" hx-post="/sources" hx-target="body" hx-swap="outerHTML">
            <h3>Add source</h3>
            <label>Name<input name="name" required /></label>
            <label>Path<input name="path" required placeholder="/absolute/path/to/publish" /></label>
            {p.addSourceError ? <div class="add-source-error">{p.addSourceError}</div> : null}
            <button type="submit">Add</button>
          </form>
        </section>

        {p.activeSourceId ? (
          <section class="shell-render-controls">
            <h2>Render</h2>
            <form hx-post="/select" hx-target="body" hx-swap="outerHTML">
              <label>Variant
                <select name="variant">
                  {p.variants.map((v) => (
                    <option value={v.name} selected={v.name === p.activeVariantName}>{v.title}</option>
                  ))}
                </select>
              </label>
              <label>Output
                <select name="output">
                  {p.outputs.map((o) => (
                    <option value={o.id} selected={o.id === p.activeOutputId}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label>Theme
                <select name="theme">
                  {(activeOutput?.themes ?? []).map((t) => (
                    <option value={t.id} selected={t.id === p.activeThemeId}>{t.label}</option>
                  ))}
                </select>
              </label>
              <button type="submit">Apply</button>
            </form>

            <form hx-post="/generate" hx-target="#generate-result" hx-swap="innerHTML" class="generate-form">
              <button type="submit">Generate</button>
              <div id="generate-result">
                {p.lastGenerated ? (
                  <span>✓ wrote <code>{p.lastGenerated.path}</code></span>
                ) : null}
              </div>
            </form>

            <p class="shell-outdir">Output folder: <code>{p.outputDir ?? '(default)'}</code></p>

            <WarningsBanner warnings={p.warnings} />
          </section>
        ) : null}
      </aside>

      <section class="shell-preview">
        {p.activeSourceId && p.activeVariantName ? (
          <iframe id="preview-frame" src={`/preview${previewQS}`} title="CV preview" />
        ) : (
          <div class="shell-empty">No variant selected. Pick one on the left.</div>
        )}
      </section>
    </div>
  );
};
```

- [ ] **Step 2: Replace `packages/server/src/routes/shell.tsx`**

```tsx
import { Hono } from 'hono';
import { join } from 'node:path';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import { loadConfig, defaultOutputDir, saveConfig } from '../config.js';
import { sourceAvailability, getActiveSource } from '../sources.js';
import { discoverVariants, listOutputs, loadVariant } from '@curricularium/core';
import type { LoadWarning } from '@curricularium/core';

export const shellRoutes = new Hono();

async function renderShell(c: import('hono').Context, addSourceError?: string) {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  const active = await getActiveSource();
  const variants = active ? await discoverVariants(active.path) : [];
  const outputs = listOutputs();
  const outputDir = active ? (active.outputDir ?? defaultOutputDir(active.path)) : null;

  let warnings: LoadWarning[] = [];
  if (active && config.activeVariantName) {
    const r = await loadVariant(join(active.path, config.activeVariantName));
    if (r.ok) warnings = r.warnings;
  }

  return c.html(
    <Layout title="Curricularium">
      <Shell
        sources={config.sources}
        activeSourceId={config.activeSourceId}
        availability={availability}
        addSourceError={addSourceError}
        variants={variants}
        outputs={outputs}
        activeVariantName={config.activeVariantName}
        activeOutputId={config.activeOutputId}
        activeThemeId={config.activeThemeId}
        outputDir={outputDir}
        warnings={warnings}
      />
    </Layout>,
  );
}

shellRoutes.get('/', (c) => renderShell(c));

shellRoutes.post('/select', async (c) => {
  const form = await c.req.parseBody();
  const config = await loadConfig();
  const next = {
    ...config,
    activeVariantName: String(form['variant'] ?? '') || null,
    activeOutputId: String(form['output'] ?? '') || null,
    activeThemeId: String(form['theme'] ?? '') || null,
  };
  await saveConfig(next);
  return renderShell(c);
});

export { renderShell };
```

- [ ] **Step 3: Update `packages/server/src/routes/sources.tsx` to use the new `renderShell`**

Replace the local `renderShell` in `sources.tsx` with an import:

```tsx
import { renderShell } from './shell.js';
```

Remove the duplicate definition. Update the three handlers (`POST /sources`, `DELETE /sources/:id`, `POST /sources/:id/activate`) to call the shared `renderShell(c, errorMessage?)`. On successful activate, also clear `activeVariantName` if the new source's variants differ — simplest is to reset `activeVariantName`, `activeOutputId`, `activeThemeId` to null on activate:

```tsx
sourceRoutes.post('/sources/:id/activate', async (c) => {
  await activateSource(c.req.param('id'));
  const config = await loadConfig();
  await saveConfig({ ...config, activeVariantName: null, activeOutputId: null, activeThemeId: null });
  return renderShell(c);
});
```

- [ ] **Step 4: Append picker styles to `packages/server/src/static/styles.css`**

```css
.shell-render-controls { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--rule); }
.shell-render-controls h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
.shell-render-controls form { display: grid; gap: 8px; margin-bottom: 12px; }
.shell-render-controls label { font-size: 12px; color: #475569; display: grid; gap: 4px; }
.shell-render-controls select { padding: 6px 8px; border: 1px solid var(--rule); border-radius: 4px; font-size: 13px; }
.shell-render-controls button { background: var(--accent); color: white; border: 0; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 600; }
.generate-form { border-top: 1px dashed var(--rule); padding-top: 10px; }
.shell-outdir { font-size: 11px; color: #64748b; word-break: break-all; }
```

- [ ] **Step 5: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/render/Shell.tsx packages/server/src/routes/shell.tsx packages/server/src/routes/sources.tsx packages/server/src/static/styles.css
git commit -m "feat(server): variant/output/theme picker UI and /select route"
```

---

### Task C7: `/generate` route with on-disk write

**Files:**
- Create: `packages/server/src/routes/generate.tsx`
- Modify: `packages/server/src/routes/index.ts`
- Modify: `packages/server/src/watcher.ts` (use autoWrite list)

- [ ] **Step 1: Create `packages/server/src/routes/generate.tsx`**

```tsx
import { Hono } from 'hono';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { loadConfig, defaultOutputDir } from '../config.js';
import { getActiveSource } from '../sources.js';
import { loadVariant, render } from '@curricularium/core';

export const generateRoutes = new Hono();

generateRoutes.post('/generate', async (c) => {
  const active = await getActiveSource();
  const config = await loadConfig();
  if (!active || !config.activeVariantName) {
    return c.html(<span class="generate-err">No active variant.</span>);
  }
  const outputId = config.activeOutputId ?? 'html';
  const themeId = config.activeThemeId ?? 'linkedin-spiritual';
  const variantRoot = join(active.path, config.activeVariantName);
  const lr = await loadVariant(variantRoot);
  if (!lr.ok) {
    return c.html(<span class="generate-err">load failed: {lr.errors[0]?.message ?? 'unknown'}</span>);
  }
  let rr;
  try {
    rr = await render({ cv: lr.cv, outputId, themeId });
  } catch (err) {
    return c.html(<span class="generate-err">render failed: {(err as Error).message}</span>);
  }
  const outDir = active.outputDir ?? defaultOutputDir(active.path);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, rr.filename);
  await writeFile(outPath, rr.bytes);
  return c.html(
    <span>
      ✓ wrote <code>{outPath}</code>{' '}
      <button type="button" hx-post={`/open-output?file=${encodeURIComponent(outPath)}`} hx-swap="none">Open file</button>
    </span>,
  );
});
```

- [ ] **Step 2: Mount the route in `packages/server/src/routes/index.ts`**

Add:

```ts
import { generateRoutes } from './generate.js';
// ...
app.route('/', generateRoutes);
```

- [ ] **Step 3: Update watcher.ts to also auto-write outputs on tick**

Append to the `setTimeout` body in `startWatching`, after the successful `loadVariant`:

```ts
// auto-write outputs flagged autoWriteOnRender
const { loadConfig } = await import('./config.js');
const { getActiveSource } = await import('./sources.js');
const { listOutputs, render } = await import('@curricularium/core');
const { mkdir, writeFile } = await import('node:fs/promises');
const { join } = await import('node:path');
const { defaultOutputDir } = await import('./config.js');

const cfg = await loadConfig();
const src = await getActiveSource();
if (src) {
  const outDir = src.outputDir ?? defaultOutputDir(src.path);
  for (const o of listOutputs()) {
    const isOn = (src.autoWrite as Record<string, boolean>)[o.id] === true && o.autoWriteOnRender;
    if (!isOn) continue;
    const themeId = (cfg.activeOutputId === o.id ? cfg.activeThemeId : null) ?? o.defaultThemeId;
    try {
      const rr = await render({ cv: result.cv, outputId: o.id, themeId });
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, rr.filename), rr.bytes);
    } catch (err) {
      console.error('[autowrite]', o.id, (err as Error).message);
    }
  }
}
```

(Pulls deps with dynamic `import` to keep the existing top-of-file imports unchanged.)

- [ ] **Step 4: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/generate.tsx packages/server/src/routes/index.ts packages/server/src/watcher.ts
git commit -m "feat(server): /generate writes artifacts; watcher auto-writes flagged outputs"
```

---

### Task C8: `/open-output` shim

**Files:**
- Create: `packages/server/src/routes/openOutput.ts`
- Modify: `packages/server/src/routes/index.ts`

- [ ] **Step 1: Create `packages/server/src/routes/openOutput.ts`**

```ts
import { Hono } from 'hono';
import { spawn } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { loadConfig, defaultOutputDir } from '../config.js';
import { getActiveSource } from '../sources.js';

export const openOutputRoutes = new Hono();

openOutputRoutes.post('/open-output', async (c) => {
  const file = c.req.query('file') ?? '';
  const active = await getActiveSource();
  if (!active) return c.text('No active source', 400);
  const outDir = resolve(active.outputDir ?? defaultOutputDir(active.path));
  const target = resolve(file);
  const rel = relative(outDir, target);
  if (rel.startsWith('..') || rel.split('/').includes('..')) {
    return c.text('Forbidden', 403);
  }
  spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
  return c.body(null, 204);
});
```

- [ ] **Step 2: Mount in `packages/server/src/routes/index.ts`**

```ts
import { openOutputRoutes } from './openOutput.js';
// ...
app.route('/', openOutputRoutes);
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routes/openOutput.ts packages/server/src/routes/index.ts
git commit -m "feat(server): /open-output shim spawns xdg-open with path guard"
```

---

### Task C9: Update `/source-asset/*` to resolve under active variant root

**Files:**
- Modify: `packages/server/src/routes/asset.ts`

- [ ] **Step 1: Replace `packages/server/src/routes/asset.ts`**

```ts
import { Hono } from 'hono';
import { readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import { getActiveSource } from '../sources.js';

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

export const assetRoutes = new Hono();

assetRoutes.get('/source-asset/*', async (c) => {
  const source = await getActiveSource();
  const config = await loadConfig();
  if (!source || !config.activeVariantName) return c.notFound();

  const variantRoot = resolve(join(source.path, config.activeVariantName));
  const requested = c.req.path.replace(/^\/source-asset\//, '');
  const absolute = resolve(variantRoot, decodeURIComponent(requested));
  const rel = relative(variantRoot, absolute);
  if (rel.startsWith('..') || rel === '' || rel.split('/').includes('..')) {
    return c.text('Forbidden', 403);
  }

  try {
    const stats = await stat(absolute);
    if (!stats.isFile()) return c.notFound();
  } catch { return c.notFound(); }

  const ext = absolute.slice(absolute.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const buf = await readFile(absolute);
  return c.body(buf, 200, { 'Content-Type': mime });
});
```

- [ ] **Step 2: Typecheck**

```bash
pnpm -F @curricularium/server typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/asset.ts
git commit -m "feat(server): /source-asset resolves under active variant root"
```

---

### Task C10: Delete v1 parser/model and rewrite README

**Files:**
- Delete: `packages/server/src/model.ts`, `packages/server/src/parse/*`, `packages/server/src/render/{CV,Sidebar,Main,ExperienceItem,EducationItem}.tsx`
- Delete: `packages/server/fixtures/`
- Modify: `packages/server/package.json` (drop parse-only deps that core now owns; keep server-only deps)
- Modify: `packages/server/README.md`

- [ ] **Step 1: Delete files**

```bash
git rm packages/server/src/model.ts \
       packages/server/src/parse/about.ts \
       packages/server/src/parse/education.ts \
       packages/server/src/parse/experience.ts \
       packages/server/src/parse/index.ts \
       packages/server/src/parse/markdown.ts \
       packages/server/src/parse/profile.ts \
       packages/server/src/parse/skills.ts \
       packages/server/src/render/CV.tsx \
       packages/server/src/render/Sidebar.tsx \
       packages/server/src/render/Main.tsx \
       packages/server/src/render/ExperienceItem.tsx \
       packages/server/src/render/EducationItem.tsx
git rm -r packages/server/fixtures
```

- [ ] **Step 2: Drop unused deps from `packages/server/package.json`**

Remove from `dependencies`: `gray-matter`, `marked`, `zod`. (Core owns those now; server uses `@curricularium/core` instead.)

Run:
```bash
pnpm install
```

- [ ] **Step 3: Replace `packages/server/README.md`**

```markdown
# @curricularium/server

Local-only web app that wraps `@curricularium/core`. Picks a source (a `publish/` root with one or more variant subfolders), lets you select a variant + output + theme, previews live, and generates artifacts to a configurable output folder.

## Run

```bash
pnpm install
pnpm vendor:htmx                       # one-shot
pnpm -F @curricularium/server dev      # localhost:3000
```

## Source shape

A registered source points at the **`publish/` root** described in `Projects/Curriculum/publish/SPEC.md`. Engine auto-discovers each `<variant>/variant.md` subfolder.

## Outputs

- **HTML** (default theme: `linkedin-spiritual`) — live preview, auto-writes on every save.
- **JSON Resume** — themes: `raw` (resume.json), plus community themes `elegant`, `kendall`, `flat`, `stackoverflow`. Explicit Generate writes to disk.
- **Europass XML** — theme: `canonical`. Explicit Generate writes to disk.

## Generate flow

Pick (variant, output, theme), click **Generate**. The server writes `<variantName>-<outputId>[-<themeId>]<ext>` to the configured output folder (default `<sourcePath>/../_out`). Open the file with the **Open file** button (Linux: `xdg-open`).

## Validation policy

The engine is best-effort: every spec validation issue surfaces as a warning in the banner; only a missing/unparseable `variant.md` blocks render. The author is the gatekeeper for SPEC.md's MUSTs.

## Test fixture for manual smoke

Register `packages/core/test/fixtures/variants/` as a source. It contains a `minimal` variant exercising every atom type.

## Trust boundary (v1)

Local-only, single-user, bound to localhost. Markdown source files are owned by the user. Body markdown rendered to HTML without sanitization. If scope ever grows, add a sanitizer before that change ships.
```

- [ ] **Step 4: Typecheck**

```bash
pnpm -r typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/server/package.json packages/server/README.md pnpm-lock.yaml
git commit -m "chore(server): remove v1 parser/model/render, rewrite README for engine"
```

---

## Phase D — Final wire-up

### Task D1: Root scripts + workspace test command

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Edit root `package.json`**

Add a `test` script:

```json
"scripts": {
  "dev": "pnpm -F @curricularium/server dev",
  "typecheck": "pnpm -r typecheck",
  "test": "pnpm -F @curricularium/core test",
  "vendor:htmx": "pnpm -F @curricularium/server vendor:htmx"
}
```

- [ ] **Step 2: Verify all-package typecheck + tests pass**

```bash
pnpm typecheck
pnpm test
```

Expected: typecheck clean, all vitest suites PASS.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: root test script for @curricularium/core suite"
```

---

### Task D2: Manual smoke checklist (no commit)

- [ ] **Step 1: Start dev server**

```bash
pnpm vendor:htmx
pnpm dev
```

Browser: http://localhost:3000.

- [ ] **Step 2: Register the core fixture as a source**

Add source:
- Name: `Fixtures`
- Path: absolute path to `packages/core/test/fixtures/variants`

It becomes active. Variant picker shows `Minimal`.

- [ ] **Step 3: Verify HTML preview**

Pick variant `Minimal`, output `HTML`, theme `linkedin-spiritual`, click **Apply**. Iframe shows the CV with name "Jane Doe", "Professional Summary", "Work Experience" sections.

- [ ] **Step 4: Verify live reload**

Edit `packages/core/test/fixtures/variants/minimal/identity/about.md` body, save. Preview iframe reloads within ~200ms. Warnings banner counter updates if the edit changes warning count.

- [ ] **Step 5: Verify JSON Resume output**

Switch output to `JSON Resume`, theme `raw`, click **Apply**. Preview pane shows pretty-printed JSON containing `"name": "Jane Doe"`.

Click **Generate**. Confirm success message `✓ wrote <path>/minimal-jsonresume.json`. Open the path with `cat` to verify content.

- [ ] **Step 6: Verify a community theme**

Switch theme to `elegant`. Preview shows themed HTML or a render-mapping warning if the theme package failed to import.

- [ ] **Step 7: Verify Europass output**

Switch output to `Europass XML`. Preview shows pretty-printed XML containing `<Identification>` and `<MotherTongue>` (if a `language` atom is present in the fixture; if not, just check `<EuropassCV`).

Click **Generate**. Confirm `<outputDir>/minimal-europass.xml` exists.

- [ ] **Step 8: Verify warnings surface**

Open `experience/010-foo.md`, save without changes (touch). Warnings banner shows the `action-verb` and `acronym` lints from the fixture body.

- [ ] **Step 9: Verify variant switching reattaches watcher**

(Only if a second variant exists in the fixture — add one if needed for this smoke step.) Switch variant; edit a file under the new variant; preview reloads. Edit a file under the old variant; preview does NOT reload.

- [ ] **Step 10: Verify Open file**

Click **Open file** next to a successful Generate. The system file viewer / browser opens the artifact (Linux only).

---

## Self-review notes

This plan was written against `docs/superpowers/specs/2026-05-29-curricularium-rendering-engine-design.md`. The agent executing it should:

- Treat the spec as the source of truth on behavior; the plan locks structure and order.
- Stop and ask if any task's tests pass against fewer assertions than the spec's intent suggests.
- Skip tasks only if a step has already been completed in a previous attempt and the commit is in `git log`.
