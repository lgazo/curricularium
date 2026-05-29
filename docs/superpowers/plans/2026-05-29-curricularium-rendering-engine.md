# Curricularium Rendering Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@curricularium/core` (spec-driven loader + three output adapters + theme registry) and rewire `@curricularium/server` to drive it via variant/output/theme pickers, a Generate-to-disk flow, and a configurable output folder.

**Architecture:** Pure engine in `packages/core` exposes `discoverVariants`, `loadVariant`, `render`. Thin HTTP shell in `packages/server` (Hono + HTMX + SSE + chokidar) calls into core. SpecCV is the canonical intermediate; output adapters (HTML, JSON Resume, Europass XML) each own a theme registry. Loader policy is best-effort with warnings (only `variant.md` missing/unparseable is fatal). HTML output auto-writes to disk on every render; JSON Resume and Europass write only on explicit Generate.

**Tech Stack:** TypeScript strict, Hono, `hono/jsx`, HTMX, gray-matter, marked, zod, chokidar, vitest. JSON Resume themes: jsonresume-theme-elegant/-kendall/-flat/-stackoverflow.

**Spec:** `docs/superpowers/specs/2026-05-29-curricularium-rendering-engine-design.md`.

---

## Phase A — Core engine foundation

### Task A1: Scaffold `@curricularium/core` package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/test/smoke.test.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@curricularium/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "marked": "^14.0.0",
    "zod": "^3.23.0",
    "jsonresume-theme-elegant": "^1.16.0",
    "jsonresume-theme-kendall": "^0.1.2",
    "jsonresume-theme-flat": "^1.0.0",
    "jsonresume-theme-stackoverflow": "^1.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create stub `packages/core/src/index.ts`**

```ts
export const VERSION = '0.0.0';
```

- [ ] **Step 4: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Create `packages/core/test/smoke.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';

describe('core package', () => {
  it('exports a version string', () => {
    expect(typeof VERSION).toBe('string');
  });
});
```

- [ ] **Step 6: Install and verify**

Run from repo root:
```bash
pnpm install
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```

Expected: vitest PASS (1 test), tsc no output.

- [ ] **Step 7: Commit**

```bash
git add packages/core/ pnpm-lock.yaml
git commit -m "feat(core): scaffold @curricularium/core package with vitest"
```

---

### Task A2: Canonical helpers (heading taxonomy, default section order, date formatters)

**Files:**
- Create: `packages/core/src/spec/canonical.ts`
- Create: `packages/core/test/spec/canonical.test.ts`

- [ ] **Step 1: Write failing test `packages/core/test/spec/canonical.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SECTION_ORDER,
  SECTION_HEADINGS,
  formatDateMMYYYY,
  formatDateISO,
  formatDateEuropass,
} from '../../src/spec/canonical.js';

describe('canonical', () => {
  it('exposes the SPEC.md §7.5 default section order', () => {
    expect(DEFAULT_SECTION_ORDER).toEqual([
      'personal',
      'identity',
      'work-experience',
      'project',
      'skill',
      'education',
      'community',
      'open-source',
      'award',
      'publication',
      'language',
    ]);
  });

  it('maps section types to SPEC.md §7.4 canonical headings', () => {
    expect(SECTION_HEADINGS['personal']).toBe('Personal Information');
    expect(SECTION_HEADINGS['identity']).toBe('Professional Summary');
    expect(SECTION_HEADINGS['work-experience']).toBe('Work Experience');
    expect(SECTION_HEADINGS['project']).toBe('Projects');
    expect(SECTION_HEADINGS['skill']).toBe('Skills');
    expect(SECTION_HEADINGS['education']).toBe('Education');
    expect(SECTION_HEADINGS['community']).toBe('Volunteering');
    expect(SECTION_HEADINGS['open-source']).toBe('Open Source');
    expect(SECTION_HEADINGS['award']).toBe('Awards and Achievements');
    expect(SECTION_HEADINGS['publication']).toBe('Publications');
    expect(SECTION_HEADINGS['language']).toBe('Languages');
  });

  it('formats YYYY-MM as MM/YYYY per §7.7', () => {
    expect(formatDateMMYYYY('2024-03')).toBe('03/2024');
    expect(formatDateMMYYYY('2024')).toBe('2024');
    expect(formatDateMMYYYY('present')).toBe('Present');
  });

  it('formats dates as YYYY-MM-DD for JSON Resume', () => {
    expect(formatDateISO('2024-03')).toBe('2024-03-01');
    expect(formatDateISO('2024')).toBe('2024-01-01');
    expect(formatDateISO('present')).toBeNull();
  });

  it('formats dates for Europass: Year + Month elements', () => {
    expect(formatDateEuropass('2024-03')).toEqual({ year: '2024', month: '--03' });
    expect(formatDateEuropass('2024')).toEqual({ year: '2024' });
    expect(formatDateEuropass('present')).toEqual({ current: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm -F @curricularium/core test
```
Expected: FAIL "Cannot find module '../../src/spec/canonical.js'".

- [ ] **Step 3: Implement `packages/core/src/spec/canonical.ts`**

```ts
import type { SectionType } from './model.js';

export const DEFAULT_SECTION_ORDER: SectionType[] = [
  'personal',
  'identity',
  'work-experience',
  'project',
  'skill',
  'education',
  'community',
  'open-source',
  'award',
  'publication',
  'language',
];

export const SECTION_HEADINGS: Record<SectionType, string> = {
  'personal': 'Personal Information',
  'identity': 'Professional Summary',
  'work-experience': 'Work Experience',
  'project': 'Projects',
  'skill': 'Skills',
  'education': 'Education',
  'community': 'Volunteering',
  'open-source': 'Open Source',
  'award': 'Awards and Achievements',
  'publication': 'Publications',
  'language': 'Languages',
};

export function summaryHeading(mode: 'summary' | 'objective'): string {
  return mode === 'objective' ? 'Objective' : 'Professional Summary';
}

export type DateLike = string;  // narrowed in model.ts; canonical accepts any of YYYY-MM, YYYY, "present"

export function formatDateMMYYYY(d: DateLike): string {
  if (d === 'present') return 'Present';
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return `${m[2]}/${m[1]}`;
  return d;  // bare YYYY
}

export function formatDateISO(d: DateLike): string | null {
  if (d === 'present') return null;
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return `${m[1]}-${m[2]}-01`;
  if (/^\d{4}$/.test(d)) return `${d}-01-01`;
  return null;
}

export type EuropassDate =
  | { year: string; month?: string }
  | { current: true };

export function formatDateEuropass(d: DateLike): EuropassDate {
  if (d === 'present') return { current: true };
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return { year: m[1]!, month: `--${m[2]}` };
  if (/^\d{4}$/.test(d)) return { year: d };
  return { year: d };
}
```

The test references `SectionType` from `model.ts` — create a minimal stub now so canonical compiles. The full model lands in Task A3.

Create `packages/core/src/spec/model.ts`:

```ts
export type SectionType =
  | 'personal' | 'identity' | 'work-experience' | 'project'
  | 'skill' | 'education' | 'community' | 'open-source'
  | 'award' | 'publication' | 'language';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: PASS 6 tests (1 from smoke + 5 from canonical). tsc no output.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/spec/ packages/core/test/spec/
git commit -m "feat(core): canonical section headings, default order, date formatters"
```

---

### Task A3: SpecCV types + Zod schemas

**Files:**
- Modify: `packages/core/src/spec/model.ts` (extend)
- Create: `packages/core/src/spec/schemas.ts`
- Create: `packages/core/test/spec/schemas.test.ts`

- [ ] **Step 1: Replace `packages/core/src/spec/model.ts` with the full type set**

```ts
export type YearMonth = `${number}-${number}`;
export type Year = `${number}`;
export type DateLike = YearMonth | Year | 'present';

export type LangCode = string;
export type LocationStr = string;

export type SectionType =
  | 'personal' | 'identity' | 'work-experience' | 'project'
  | 'skill' | 'education' | 'community' | 'open-source'
  | 'award' | 'publication' | 'language';

export type Profile = { network: string; url: string; username: string | null };

export type AtomBase = {
  name: string;
  source: string | null;
  order: number;
  lang: LangCode;
  variantRationale?: string;
};

export type WorkExperience = AtomBase & {
  type: 'work-experience';
  employer: string;
  position: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  location: LocationStr;
  url: string | null;
  skills: string[];
  keywords: string[];
  refProjects: string[];
  teamSize: number | null;
  reportLine: string | null;
  body: string;
};

export type Project = AtomBase & {
  type: 'project';
  title: string;
  client: string | null;
  employer: string;
  parentExperience: string | null;
  periodStart: DateLike;
  periodEnd: DateLike | null;
  location: LocationStr | null;
  sector: string;
  roles: string[];
  tech: string[];
  url: string | null;
  keywords: string[];
  body: string;
};

export type Education = AtomBase & {
  type: 'education';
  institution: string;
  location: LocationStr;
  degree: string;
  field: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  honours: string | null;
  url: string | null;
  body: string;
};

export type Community = AtomBase & {
  type: 'community';
  organisation: string;
  role: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  location: LocationStr | null;
  url: string | null;
  body: string;
};

export type OpenSource = AtomBase & {
  type: 'open-source';
  title: string;
  repoUrl: string;
  role: 'author' | 'maintainer' | 'contributor';
  periodStart: DateLike;
  periodEnd: DateLike;
  tech: string[];
  keywords: string[];
  body: string;
};

export type Award = AtomBase & {
  type: 'award';
  title: string;
  awarder: string;
  date: DateLike;
  url: string | null;
  body: string;
};

export type Publication = AtomBase & {
  type: 'publication';
  title: string;
  publisher: string;
  date: DateLike;
  url: string | null;
  authors: string[];
  body: string;
};

export type SkillGroup = {
  name: string;
  items: string[];
  level: string | null;
  europassBucket?: 'JobRelated' | 'Digital' | 'Communication' | 'Organisational';
};

export type Skills = AtomBase & {
  type: 'skill';
  groups: SkillGroup[];
  body: string;
};

export type Language = {
  code: LangCode;
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
  detail: string | null;
};

export type Languages = AtomBase & {
  type: 'language';
  languages: Language[];
  body: string;
};

export type Personal = AtomBase & {
  type: 'personal';
  fullName: string;
  targetRole: string;
  email: string;
  phone: string | null;
  location: LocationStr;
  profiles: Profile[];
  body: string;
};

export type IdentityHeadline = AtomBase & { type: 'identity'; subtype: 'headline'; body: string };
export type IdentityAbout = AtomBase & { type: 'identity'; subtype: 'about'; body: string };

export type VariantManifest = {
  type: 'variant';
  name: string;
  title: string;
  targetRole: string;
  sectionOrder: SectionType[];
  lang: LangCode;
  sourceMaster: string;
  outputTargets: string[];
  summaryMode: 'summary' | 'objective';
  collapseOpenSource: boolean;
  body: string;
};

export type SpecCV = {
  variantRoot: string;
  variant: VariantManifest;
  personal: Personal | null;
  identity: { headline: IdentityHeadline | null; about: IdentityAbout | null };
  workExperience: WorkExperience[];
  projects: Project[];
  education: Education[];
  community: Community[];
  openSource: OpenSource[];
  awards: Award[];
  publications: Publication[];
  skills: Skills | null;
  languages: Languages | null;
};

export type WarningCategory =
  | 'schema' | 'unknown-field' | 'visibility' | 'date'
  | 'body-h1' | 'action-verb' | 'acronym' | 'banned-string'
  | 'cross-atom' | 'identity-missing' | 'multi-singleton' | 'render-mapping';

export type LoadWarning = {
  file: string;
  field?: string;
  message: string;
  category: WarningCategory;
};
```

- [ ] **Step 2: Write failing test `packages/core/test/spec/schemas.test.ts`**

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm -F @curricularium/core test
```
Expected: FAIL "Cannot find module '../../src/spec/schemas.js'".

- [ ] **Step 4: Implement `packages/core/src/spec/schemas.ts`**

```ts
import { z } from 'zod';
import { DEFAULT_SECTION_ORDER } from './canonical.js';
import type { SectionType } from './model.js';

const DateLikeSchema = z
  .string()
  .transform((s) => (s.toLowerCase() === 'present' ? 'present' : s))
  .refine(
    (s) => s === 'present' || /^\d{4}(-\d{2})?$/.test(s),
    { message: 'expected YYYY, YYYY-MM, or "present"' },
  );

const SectionTypeSchema = z.enum([
  'personal', 'identity', 'work-experience', 'project',
  'skill', 'education', 'community', 'open-source',
  'award', 'publication', 'language',
]);

const AtomBaseFields = {
  name: z.string().min(1),
  source: z.string().nullable().default(null),
  order: z.number().int().default(0),
  lang: z.string().default('en'),
  'variant-rationale': z.string().optional(),
};

function withBase<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...AtomBaseFields, ...shape }).transform((raw) => {
    const { 'variant-rationale': vr, ...rest } = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      out[kebabToCamel(k)] = v;
    }
    if (vr !== undefined) out['variantRationale'] = vr;
    return out;
  });
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export const WorkExperienceSchema = withBase({
  type: z.literal('work-experience'),
  employer: z.string().min(1),
  position: z.string().min(1),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  location: z.string().min(1),
  url: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  'ref-projects': z.array(z.string()).default([]),
  'team-size': z.number().int().nullable().default(null),
  'report-line': z.string().nullable().default(null),
  body: z.string().default(''),
});

export const ProjectSchema = withBase({
  type: z.literal('project'),
  title: z.string().min(1),
  client: z.string().nullable().default(null),
  employer: z.string().min(1),
  'parent-experience': z.string().nullable().default(null),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema.nullable().default(null),
  location: z.string().nullable().default(null),
  sector: z.string().default(''),
  roles: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
  url: z.string().nullable().default(null),
  keywords: z.array(z.string()).default([]),
  body: z.string().default(''),
});

export const EducationSchema = withBase({
  type: z.literal('education'),
  institution: z.string().min(1),
  location: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().default(''),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  honours: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  body: z.string().default(''),
});

export const CommunitySchema = withBase({
  type: z.literal('community'),
  organisation: z.string().min(1),
  role: z.string().min(1),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  location: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  body: z.string().default(''),
});

export const OpenSourceSchema = withBase({
  type: z.literal('open-source'),
  title: z.string().min(1),
  'repo-url': z.string().min(1),
  role: z.enum(['author', 'maintainer', 'contributor']),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  tech: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  body: z.string().default(''),
});

export const AwardSchema = withBase({
  type: z.literal('award'),
  title: z.string().min(1),
  awarder: z.string().min(1),
  date: DateLikeSchema,
  url: z.string().nullable().default(null),
  body: z.string().default(''),
});

export const PublicationSchema = withBase({
  type: z.literal('publication'),
  title: z.string().min(1),
  publisher: z.string().min(1),
  date: DateLikeSchema,
  url: z.string().nullable().default(null),
  authors: z.array(z.string()).default([]),
  body: z.string().default(''),
});

const SkillGroupSchema = z.object({
  name: z.string().min(1),
  items: z.array(z.string()).min(1),
  level: z.string().nullable().default(null),
  'europass-bucket': z.enum(['JobRelated', 'Digital', 'Communication', 'Organisational']).optional(),
}).transform((g) => {
  const out: Record<string, unknown> = { name: g.name, items: g.items, level: g.level };
  if (g['europass-bucket']) out['europassBucket'] = g['europass-bucket'];
  return out;
});

export const SkillsSchema = withBase({
  type: z.literal('skill'),
  groups: z.array(SkillGroupSchema).min(1),
  body: z.string().default(''),
});

const LanguageSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native']),
  detail: z.string().nullable().default(null),
});

export const LanguagesSchema = withBase({
  type: z.literal('language'),
  languages: z.array(LanguageSchema).min(1),
  body: z.string().default(''),
});

const ProfileSchema = z.object({
  network: z.string().min(1),
  url: z.string().min(1),
  username: z.string().nullable().default(null),
});

export const PersonalSchema = withBase({
  type: z.literal('personal'),
  'full-name': z.string().min(1),
  'target-role': z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().default(null),
  location: z.string().min(1),
  profiles: z.array(ProfileSchema).default([]),
  body: z.string().default(''),
});

export const IdentityHeadlineSchema = withBase({
  type: z.literal('identity'),
  subtype: z.literal('headline'),
  body: z.string().default(''),
});

export const IdentityAboutSchema = withBase({
  type: z.literal('identity'),
  subtype: z.literal('about'),
  body: z.string().default(''),
});

export const VariantManifestSchema = z.object({
  type: z.literal('variant'),
  name: z.string().min(1),
  title: z.string().min(1),
  'target-role': z.string().min(1),
  'section-order': z.array(SectionTypeSchema).optional(),
  lang: z.string().default('en'),
  'source-master': z.string().default(''),
  'output-targets': z.array(z.string()).default([]),
  'summary-mode': z.enum(['summary', 'objective']).default('summary'),
  'collapse-open-source': z.boolean().default(false),
  body: z.string().default(''),
}).transform((raw) => ({
  type: raw.type,
  name: raw.name,
  title: raw.title,
  targetRole: raw['target-role'],
  sectionOrder: (raw['section-order'] ?? DEFAULT_SECTION_ORDER) as SectionType[],
  lang: raw.lang,
  sourceMaster: raw['source-master'],
  outputTargets: raw['output-targets'],
  summaryMode: raw['summary-mode'],
  collapseOpenSource: raw['collapse-open-source'],
  body: raw.body,
}));

export const AtomSchemaByType = {
  'work-experience': WorkExperienceSchema,
  'project': ProjectSchema,
  'education': EducationSchema,
  'community': CommunitySchema,
  'open-source': OpenSourceSchema,
  'award': AwardSchema,
  'publication': PublicationSchema,
  'skill': SkillsSchema,
  'language': LanguagesSchema,
  'personal': PersonalSchema,
} as const;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: all schema tests PASS. tsc no output.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/spec/ packages/core/test/spec/
git commit -m "feat(core): SpecCV types and per-atom Zod schemas"
```

---

### Task A4: Atom file reader (gray-matter, HTML comment stripping, visibility)

**Files:**
- Create: `packages/core/src/loader/atoms.ts`
- Create: `packages/core/test/loader/atoms.test.ts`
- Create: `packages/core/test/fixtures/atoms/work-ok.md`
- Create: `packages/core/test/fixtures/atoms/work-nda.md`
- Create: `packages/core/test/fixtures/atoms/with-comments.md`

- [ ] **Step 1: Create fixture files**

`packages/core/test/fixtures/atoms/work-ok.md`:
```markdown
---
type: work-experience
name: nexthink
source: master-v02/experience/nexthink
order: 10
lang: en
visibility: public
employer: Nexthink
position: CTO
period-start: 2024-01
period-end: present
location: Lausanne, Switzerland
url: https://nexthink.com
skills: [leadership, architecture]
keywords: [DAP]
ref-projects: []
team-size: 25
report-line: VP Engineering then CTO
---

Led the platform team through a 0→1 product bet.

- Shipped DAP analytics in 9 months.
- Hired 8 engineers across two timezones.
```

`packages/core/test/fixtures/atoms/work-nda.md`:
```markdown
---
type: work-experience
name: stealth
source: null
order: 20
lang: en
visibility: nda
employer: Stealth Co
position: Advisor
period-start: 2023-01
period-end: present
location: Remote
url: null
skills: []
keywords: []
ref-projects: []
team-size: null
report-line: null
---

Hidden content.
```

`packages/core/test/fixtures/atoms/with-comments.md`:
```markdown
---
type: award
name: x
source: null
order: 0
lang: en
visibility: public
title: X
awarder: Y
date: 2024
url: null
---

<!-- src: master-v02/awards/x.md -->
Body kept. <!-- inline note --> Still kept.
```

- [ ] **Step 2: Write failing test `packages/core/test/loader/atoms.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readAtomFile, stripHtmlComments } from '../../src/loader/atoms.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, '..', 'fixtures', 'atoms');

describe('atom reader', () => {
  it('reads a valid work-experience atom and returns frontmatter + body', async () => {
    const a = await readAtomFile(join(FIX, 'work-ok.md'));
    expect(a.frontmatter.type).toBe('work-experience');
    expect(a.frontmatter.name).toBe('nexthink');
    expect(a.frontmatter.visibility).toBe('public');
    expect(a.body).toContain('Led the platform team');
  });

  it('reports visibility=nda atoms as non-public', async () => {
    const a = await readAtomFile(join(FIX, 'work-nda.md'));
    expect(a.frontmatter.visibility).toBe('nda');
  });

  it('strips HTML comments from body', async () => {
    const a = await readAtomFile(join(FIX, 'with-comments.md'));
    const cleaned = stripHtmlComments(a.body);
    expect(cleaned).not.toContain('<!--');
    expect(cleaned).not.toContain('src: master-v02');
    expect(cleaned).toContain('Body kept.');
    expect(cleaned).toContain('Still kept.');
  });

  it('strips block-spanning HTML comments', () => {
    const out = stripHtmlComments('a <!-- multi\nline\ncomment --> b');
    expect(out).toBe('a  b');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm -F @curricularium/core test
```
Expected: FAIL "Cannot find module '../../src/loader/atoms.js'".

- [ ] **Step 4: Implement `packages/core/src/loader/atoms.ts`**

```ts
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';

export type AtomRaw = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export async function readAtomFile(path: string): Promise<AtomRaw> {
  const raw = await readFile(path, 'utf8');
  const parsed = matter(raw);
  return {
    path,
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}

export function stripHtmlComments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, '');
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm -F @curricularium/core test
```
Expected: 4 atom-reader tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/loader/atoms.ts packages/core/test/loader/ packages/core/test/fixtures/
git commit -m "feat(core): atom file reader with HTML comment stripping"
```

---

### Task A5: Discover variants from publish root

**Files:**
- Create: `packages/core/src/loader/discover.ts`
- Create: `packages/core/test/loader/discover.test.ts`
- Create: `packages/core/test/fixtures/discover/founder-cto/variant.md`
- Create: `packages/core/test/fixtures/discover/vp-eng/variant.md`
- Create: `packages/core/test/fixtures/discover/_schema/.gitkeep`

- [ ] **Step 1: Create fixture variant manifests**

`packages/core/test/fixtures/discover/founder-cto/variant.md`:
```markdown
---
type: variant
name: founder-cto
title: Founder-CTO
target-role: 0→1 deep-tech CTO
lang: en
source-master: master-v02
output-targets: [json-resume, europass-xml]
---
```

`packages/core/test/fixtures/discover/vp-eng/variant.md`:
```markdown
---
type: variant
name: vp-eng
title: VP Engineering
target-role: VP / Director of Engineering
lang: en
source-master: master-v02
output-targets: [json-resume]
---
```

`packages/core/test/fixtures/discover/_schema/.gitkeep`: empty file.

- [ ] **Step 2: Write failing test `packages/core/test/loader/discover.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverVariants } from '../../src/loader/discover.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLISH = join(here, '..', 'fixtures', 'discover');

describe('discoverVariants', () => {
  it('returns variants in sorted name order', async () => {
    const vs = await discoverVariants(PUBLISH);
    expect(vs.map((v) => v.name)).toEqual(['founder-cto', 'vp-eng']);
    expect(vs[0]!.title).toBe('Founder-CTO');
  });

  it('ignores non-variant subfolders like _schema', async () => {
    const vs = await discoverVariants(PUBLISH);
    expect(vs.find((v) => v.name === '_schema')).toBeUndefined();
  });

  it('returns absolute paths', async () => {
    const vs = await discoverVariants(PUBLISH);
    for (const v of vs) expect(v.path.startsWith('/')).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm -F @curricularium/core test
```
Expected: FAIL "Cannot find module '../../src/loader/discover.js'".

- [ ] **Step 4: Implement `packages/core/src/loader/discover.ts`**

```ts
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';

export type VariantSummary = { name: string; title: string; path: string };

export async function discoverVariants(publishRoot: string): Promise<VariantSummary[]> {
  const root = resolve(publishRoot);
  if (!existsSync(root)) return [];

  const entries = await readdir(root);
  const out: VariantSummary[] = [];
  for (const entry of entries) {
    if (entry.startsWith('.') || entry.startsWith('_')) continue;
    const candidate = join(root, entry);
    let s;
    try {
      s = await stat(candidate);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    const manifest = join(candidate, 'variant.md');
    if (!existsSync(manifest)) continue;
    try {
      const raw = await readFile(manifest, 'utf8');
      const fm = matter(raw).data as Record<string, unknown>;
      const name = String(fm['name'] ?? entry);
      const title = String(fm['title'] ?? entry);
      out.push({ name, title, path: candidate });
    } catch {
      continue;
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm -F @curricularium/core test
```
Expected: 3 discover tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/loader/discover.ts packages/core/test/loader/discover.test.ts packages/core/test/fixtures/discover/
git commit -m "feat(core): discoverVariants from publish/ root"
```

---

### Task A6: Assemble loaded atoms into SpecCV

**Files:**
- Create: `packages/core/src/loader/assemble.ts`
- Create: `packages/core/test/loader/assemble.test.ts`

(Atom-level visibility filter and per-`type:` schema parsing happen inside `assemble.ts` — the assembler is the single place that decides what enters the model.)

- [ ] **Step 1: Write failing test `packages/core/test/loader/assemble.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm -F @curricularium/core test
```
Expected: FAIL "Cannot find module '../../src/loader/assemble.js'".

- [ ] **Step 3: Implement `packages/core/src/loader/assemble.ts`**

```ts
import { AtomSchemaByType, IdentityAboutSchema, IdentityHeadlineSchema } from '../spec/schemas.js';
import type {
  Award, Community, Education, IdentityAbout, IdentityHeadline, Languages,
  LoadWarning, OpenSource, Personal, Project, Publication, Skills, SpecCV,
  VariantManifest, WorkExperience,
} from '../spec/model.js';
import { stripHtmlComments } from './atoms.js';
import type { AtomRaw } from './atoms.js';

export type AssembleResult = { cv: SpecCV; warnings: LoadWarning[] };

export function assemble(variantRoot: string, variant: VariantManifest, atoms: AtomRaw[]): AssembleResult {
  const warnings: LoadWarning[] = [];

  const cv: SpecCV = {
    variantRoot,
    variant,
    personal: null,
    identity: { headline: null, about: null },
    workExperience: [],
    projects: [],
    education: [],
    community: [],
    openSource: [],
    awards: [],
    publications: [],
    skills: null,
    languages: null,
  };

  for (const atom of atoms) {
    const type = atom.frontmatter['type'];
    const visibility = (atom.frontmatter['visibility'] as string | undefined) ?? 'public';
    if (visibility !== 'public') {
      warnings.push({
        file: atom.path,
        category: 'visibility',
        message: `skipped (visibility=${visibility})`,
      });
      continue;
    }
    const body = stripHtmlComments(atom.body);

    if (type === 'identity') {
      const subtype = atom.frontmatter['subtype'];
      if (subtype === 'headline') {
        const p = IdentityHeadlineSchema.safeParse({ ...atom.frontmatter, body });
        if (!p.success) { addSchemaWarnings(warnings, atom.path, p.error.issues); continue; }
        cv.identity.headline = p.data as unknown as IdentityHeadline;
      } else if (subtype === 'about') {
        const p = IdentityAboutSchema.safeParse({ ...atom.frontmatter, body });
        if (!p.success) { addSchemaWarnings(warnings, atom.path, p.error.issues); continue; }
        cv.identity.about = p.data as unknown as IdentityAbout;
      } else {
        warnings.push({
          file: atom.path, category: 'schema',
          message: `unknown identity subtype: ${String(subtype)}`,
        });
      }
      continue;
    }

    if (typeof type !== 'string' || !(type in AtomSchemaByType)) {
      warnings.push({ file: atom.path, category: 'schema', message: `unknown atom type: ${String(type)}` });
      continue;
    }

    const schema = (AtomSchemaByType as Record<string, { safeParse: (x: unknown) => any }>)[type]!;
    const parsed = schema.safeParse({ ...atom.frontmatter, body });
    if (!parsed.success) {
      addSchemaWarnings(warnings, atom.path, parsed.error.issues);
      continue;
    }
    const v = parsed.data;
    switch (type) {
      case 'work-experience': cv.workExperience.push(v as WorkExperience); break;
      case 'project': cv.projects.push(v as Project); break;
      case 'education': cv.education.push(v as Education); break;
      case 'community': cv.community.push(v as Community); break;
      case 'open-source': cv.openSource.push(v as OpenSource); break;
      case 'award': cv.awards.push(v as Award); break;
      case 'publication': cv.publications.push(v as Publication); break;
      case 'skill':
        if (cv.skills) {
          warnings.push({ file: atom.path, category: 'multi-singleton', message: 'skills.md already loaded' });
        } else cv.skills = v as Skills;
        break;
      case 'language':
        if (cv.languages) {
          warnings.push({ file: atom.path, category: 'multi-singleton', message: 'languages.md already loaded' });
        } else cv.languages = v as Languages;
        break;
      case 'personal':
        if (cv.personal) {
          warnings.push({ file: atom.path, category: 'multi-singleton', message: 'personal.md already loaded' });
        } else cv.personal = v as Personal;
        break;
    }
  }

  cv.workExperience.sort(byPeriodStartDesc);
  cv.education.sort(byPeriodStartDesc);
  cv.community.sort(byPeriodStartDesc);
  cv.openSource.sort(byPeriodStartDesc);
  cv.awards.sort((a, b) => b.date.localeCompare(a.date));
  cv.publications.sort((a, b) => b.date.localeCompare(a.date));

  cv.projects = sortProjects(cv.projects);

  if (variant.sectionOrder.includes('identity')) {
    if (!cv.identity.about) {
      warnings.push({
        file: variantRoot, category: 'identity-missing',
        message: 'identity/about.md not found; Professional Summary section will be empty',
      });
    }
  }

  return { cv, warnings };
}

function addSchemaWarnings(warnings: LoadWarning[], file: string, issues: { path: (string | number)[]; message: string }[]): void {
  for (const i of issues) {
    warnings.push({
      file, category: 'schema',
      field: i.path.join('.'),
      message: i.message,
    });
  }
}

function byPeriodStartDesc<T extends { periodStart: string; order: number }>(a: T, b: T): number {
  const cmp = b.periodStart.localeCompare(a.periodStart);
  return cmp !== 0 ? cmp : a.order - b.order;
}

function sortProjects(projects: Project[]): Project[] {
  const groups = new Map<string, Project[]>();
  const groupOrder: string[] = [];
  for (const p of projects) {
    const key = p.parentExperience ?? '__none__';
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(p);
  }
  const out: Project[] = [];
  for (const key of groupOrder) {
    const arr = groups.get(key)!;
    arr.sort((a, b) => {
      const cmp = b.periodStart.localeCompare(a.periodStart);
      return cmp !== 0 ? cmp : a.order - b.order;
    });
    out.push(...arr);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: 7 assemble tests PASS. tsc no output.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/loader/assemble.ts packages/core/test/loader/assemble.test.ts
git commit -m "feat(core): assemble atoms into SpecCV with sort, visibility, identity pairing"
```

---

### Task A7: Cross-atom warnings, banned strings, `loadVariant` entry

**Files:**
- Create: `packages/core/src/spec/banned-strings.json`
- Create: `packages/core/src/loader/lints.ts`
- Create: `packages/core/src/loader/index.ts`
- Create: `packages/core/test/loader/lints.test.ts`
- Create: `packages/core/test/loader/loadVariant.test.ts`
- Create: `packages/core/test/fixtures/variants/minimal/variant.md`
- Create: `packages/core/test/fixtures/variants/minimal/personal.md`
- Create: `packages/core/test/fixtures/variants/minimal/identity/about.md`
- Create: `packages/core/test/fixtures/variants/minimal/experience/010-foo.md`
- Create: `packages/core/test/fixtures/variants/missing/.gitkeep`

- [ ] **Step 1: Create `packages/core/src/spec/banned-strings.json`**

```json
["salary", "ARR", "revenue", "EBITDA", "headcount"]
```

- [ ] **Step 2: Create minimal-variant fixture**

`packages/core/test/fixtures/variants/minimal/variant.md`:
```markdown
---
type: variant
name: minimal
title: Minimal
target-role: Engineer
lang: en
source-master: master-v02
output-targets: [json-resume]
---
```

`packages/core/test/fixtures/variants/minimal/personal.md`:
```markdown
---
type: personal
name: personal
source: null
order: 0
lang: en
visibility: public
full-name: Jane Doe
target-role: Engineer
email: jane@example.com
phone: null
location: Bratislava, Slovakia
profiles:
  - { network: github, url: https://github.com/jdoe, username: jdoe }
---
```

`packages/core/test/fixtures/variants/minimal/identity/about.md`:
```markdown
---
type: identity
subtype: about
name: about
source: null
order: 0
lang: en
visibility: public
---

Senior Engineer with deep platform experience.
```

`packages/core/test/fixtures/variants/minimal/experience/010-foo.md`:
```markdown
---
type: work-experience
name: foo
source: null
order: 0
lang: en
visibility: public
employer: Foo Inc
position: Senior Engineer
period-start: 2022-01
period-end: present
location: Remote
url: null
skills: []
keywords: [DAP]
ref-projects: []
team-size: null
report-line: null
---

Shipped the platform.

- Led migration to event sourcing.
- Was responsible for hiring.
```

`packages/core/test/fixtures/variants/missing/.gitkeep`: empty file (used by the loadVariant test for the "missing variant.md" case).

- [ ] **Step 3: Write failing test `packages/core/test/loader/lints.test.ts`**

```ts
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
```

- [ ] **Step 4: Implement `packages/core/src/loader/lints.ts`**

```ts
import type { LoadWarning, SpecCV } from '../spec/model.js';

const ACTION_VERB_LEAD = /^(led|shipped|architected|scaled|integrated|founded|rebuilt|delivered|built|drove|launched|grew|owned|managed|reduced|increased|created|migrated|negotiated|recruited|hired|established|introduced|coached|partnered|championed|orchestrated|landed|coordinated|standardised|standardized)\b/i;

const ACRONYM_RE = /\b[A-Z]{2,6}\b/g;

export function computeLints(cv: SpecCV, bannedStrings: string[]): LoadWarning[] {
  const warnings: LoadWarning[] = [];

  // banned strings (case-insensitive word boundary)
  if (bannedStrings.length > 0) {
    const patterns = bannedStrings.map((p) => new RegExp(`\\b${escapeRegex(p)}\\b`, 'i'));
    for (const atom of allBodiedAtoms(cv)) {
      for (let i = 0; i < patterns.length; i++) {
        if (patterns[i]!.test(atom.body)) {
          warnings.push({
            file: atom.file, category: 'banned-string',
            message: `matches "${bannedStrings[i]}" pattern`,
          });
        }
      }
    }
  }

  // action-verb lead on bullets
  for (const atom of allBodiedAtoms(cv)) {
    const bullets = atom.body.split(/\r?\n/).filter((l) => /^\s*-\s+/.test(l));
    for (let i = 0; i < bullets.length; i++) {
      const text = bullets[i]!.replace(/^\s*-\s+/, '').trim();
      const firstWord = text.split(/\s+/)[0] ?? '';
      if (firstWord && !ACTION_VERB_LEAD.test(text)) {
        warnings.push({
          file: atom.file, category: 'action-verb',
          message: `bullet ${i + 1} starts with "${firstWord}"`,
        });
      }
    }
  }

  // date sanity
  for (const e of cv.workExperience) checkDates(warnings, e.path('work-experience', e.name), e.periodStart, e.periodEnd);
  for (const e of cv.education) checkDates(warnings, `education/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.community) checkDates(warnings, `community/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.openSource) checkDates(warnings, `open-source/${e.name}`, e.periodStart, e.periodEnd);

  // present misuse: only the most recent work-experience may have present
  for (let i = 1; i < cv.workExperience.length; i++) {
    if (cv.workExperience[i]!.periodEnd === 'present') {
      warnings.push({
        file: `work-experience/${cv.workExperience[i]!.name}`,
        category: 'date',
        message: '"present" allowed only on the most recent work-experience',
      });
    }
  }

  // cross-atom: refProjects must resolve
  const projectNames = new Set(cv.projects.map((p) => p.name));
  for (const w of cv.workExperience) {
    for (let i = 0; i < w.refProjects.length; i++) {
      if (!projectNames.has(w.refProjects[i]!)) {
        warnings.push({
          file: `work-experience/${w.name}`, category: 'cross-atom',
          field: `ref-projects[${i}]`,
          message: `"${w.refProjects[i]}" not found in projects`,
        });
      }
    }
  }
  // cross-atom: parentExperience must resolve
  const expNames = new Set(cv.workExperience.map((e) => e.name));
  for (const p of cv.projects) {
    if (p.parentExperience && !expNames.has(p.parentExperience)) {
      warnings.push({
        file: `project/${p.name}`, category: 'cross-atom',
        field: 'parent-experience',
        message: `"${p.parentExperience}" not found in work-experience`,
      });
    }
  }

  // acronym first-use check (document-wide)
  const seenFullTerms = new Set<string>();
  // build full-term map from all bodies first (rough heuristic: "Word Phrase (ACR)" introduces ACR)
  const introduced = new Set<string>();
  for (const atom of allBodiedAtoms(cv)) {
    for (const m of atom.body.matchAll(/\(([A-Z]{2,6})\)/g)) introduced.add(m[1]!);
  }
  for (const atom of allBodiedAtoms(cv)) {
    const acronyms = new Set<string>();
    for (const m of atom.body.matchAll(ACRONYM_RE)) acronyms.add(m[0]);
    for (const acr of acronyms) {
      if (!introduced.has(acr) && !seenFullTerms.has(acr)) {
        warnings.push({
          file: atom.file, category: 'acronym',
          message: `"${acr}" appears before full term`,
        });
        seenFullTerms.add(acr);
      }
    }
  }

  return warnings;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type BodiedRef = { file: string; body: string };

function allBodiedAtoms(cv: SpecCV): BodiedRef[] {
  const out: BodiedRef[] = [];
  const add = (type: string, name: string, body: string) => out.push({ file: `${type}/${name}`, body });
  if (cv.personal) add('personal', cv.personal.name, cv.personal.body);
  if (cv.identity.headline) add('identity', 'headline', cv.identity.headline.body);
  if (cv.identity.about) add('identity', 'about', cv.identity.about.body);
  for (const w of cv.workExperience) add('work-experience', w.name, w.body);
  for (const p of cv.projects) add('project', p.name, p.body);
  for (const e of cv.education) add('education', e.name, e.body);
  for (const e of cv.community) add('community', e.name, e.body);
  for (const e of cv.openSource) add('open-source', e.name, e.body);
  for (const e of cv.awards) add('award', e.name, e.body);
  for (const e of cv.publications) add('publication', e.name, e.body);
  if (cv.skills) add('skill', cv.skills.name, cv.skills.body);
  if (cv.languages) add('language', cv.languages.name, cv.languages.body);
  return out;
}

function checkDates(warnings: LoadWarning[], file: string, start: string, end: string | null): void {
  if (end === null || end === 'present') return;
  if (end.localeCompare(start) < 0) {
    warnings.push({ file, category: 'date', message: 'period-end before period-start' });
  }
}

// `path` is referenced in the tests as a helper on entries — provide a tiny module-level helper
// instead. The test using `.path(...)` is rewritten in the implementation step below.
declare module '../spec/model.js' {
  interface WorkExperience { path(type: string, name: string): string }
}
```

Remove the test reference to `e.path(...)` — update the lints test's date case to use a simple constructed file path. Replace this section in `lints.test.ts`:

```ts
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
```

(That test already uses `education`, which is handled directly by `checkDates`. Remove the `declare module` block and the `e.path(...)` call from `lints.ts` — they were a stub. Final `lints.ts` should call `checkDates(warnings, \`work-experience/${e.name}\`, e.periodStart, e.periodEnd)` for the work-experience loop too.)

Replace the four date-check lines in `lints.ts` with:

```ts
  for (const e of cv.workExperience) checkDates(warnings, `work-experience/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.education) checkDates(warnings, `education/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.community) checkDates(warnings, `community/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.openSource) checkDates(warnings, `open-source/${e.name}`, e.periodStart, e.periodEnd);
```

And delete the `declare module` block.

- [ ] **Step 5: Run lint tests to verify they pass**

```bash
pnpm -F @curricularium/core test
```
Expected: 5 lint tests PASS.

- [ ] **Step 6: Write failing test `packages/core/test/loader/loadVariant.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVariant } from '../../src/loader/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, '..', 'fixtures', 'variants');

describe('loadVariant', () => {
  it('loads the minimal fixture and reports ok with warnings', async () => {
    const r = await loadVariant(join(FIX, 'minimal'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cv.variant.name).toBe('minimal');
    expect(r.cv.personal?.fullName).toBe('Jane Doe');
    expect(r.cv.identity.about?.body).toContain('Senior Engineer');
    expect(r.cv.workExperience).toHaveLength(1);
    expect(r.cv.workExperience[0]!.employer).toBe('Foo Inc');
    // fixture intentionally trips two lints
    expect(r.warnings.some((w) => w.category === 'action-verb')).toBe(true);
    expect(r.warnings.some((w) => w.category === 'acronym')).toBe(true);
  });

  it('returns ok:false when variant.md is missing', async () => {
    const r = await loadVariant(join(FIX, 'missing'));
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 7: Implement `packages/core/src/loader/index.ts`**

```ts
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import bannedStrings from '../spec/banned-strings.json' assert { type: 'json' };
import type { LoadWarning, SpecCV } from '../spec/model.js';
import { VariantManifestSchema } from '../spec/schemas.js';
import { readAtomFile, type AtomRaw } from './atoms.js';
import { assemble } from './assemble.js';
import { computeLints } from './lints.js';

export type LoadResult =
  | { ok: true; cv: SpecCV; warnings: LoadWarning[] }
  | { ok: false; errors: LoadWarning[] };

export async function loadVariant(variantRoot: string): Promise<LoadResult> {
  const root = resolve(variantRoot);
  const manifestPath = join(root, 'variant.md');
  if (!existsSync(manifestPath)) {
    return { ok: false, errors: [{ file: manifestPath, category: 'schema', message: 'variant.md not found' }] };
  }

  let variant;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const fm = matter(raw);
    const parsed = VariantManifestSchema.safeParse(fm.data);
    if (!parsed.success) {
      return { ok: false, errors: parsed.error.issues.map((i) => ({
        file: manifestPath, category: 'schema',
        field: i.path.join('.'), message: i.message,
      })) };
    }
    variant = { ...parsed.data, body: fm.content };
  } catch (err) {
    return { ok: false, errors: [{ file: manifestPath, category: 'schema', message: (err as Error).message }] };
  }

  const atoms = await collectAtoms(root);
  const a = assemble(root, variant, atoms);
  const lints = computeLints(a.cv, bannedStrings as string[]);
  return { ok: true, cv: a.cv, warnings: [...a.warnings, ...lints] };
}

async function collectAtoms(root: string): Promise<AtomRaw[]> {
  const out: AtomRaw[] = [];
  await walk(root, root, out);
  return out;
}

async function walk(root: string, dir: string, out: AtomRaw[]): Promise<void> {
  const entries = await readdir(dir);
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      await walk(root, full, out);
      continue;
    }
    if (!entry.endsWith('.md')) continue;
    if (full === join(root, 'variant.md')) continue;
    out.push(await readAtomFile(full));
  }
}
```

- [ ] **Step 8: Run loadVariant test to verify it passes**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: 2 loadVariant tests PASS. All earlier tests still PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/loader/ packages/core/src/spec/banned-strings.json packages/core/test/loader/ packages/core/test/fixtures/variants/
git commit -m "feat(core): loadVariant entry with cross-atom lints and banned strings"
```

---

## Phase B — Output adapters

### Task B1: Output registry types

**Files:**
- Create: `packages/core/src/outputs/registry.ts`
- Create: `packages/core/test/outputs/registry.test.ts`

- [ ] **Step 1: Write failing test `packages/core/test/outputs/registry.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { registry, listOutputs, findTheme } from '../../src/outputs/registry.js';

describe('output registry', () => {
  it('exposes html, jsonresume, europass outputs', () => {
    const ids = listOutputs().map((o) => o.id).sort();
    expect(ids).toEqual(['europass', 'html', 'jsonresume']);
  });

  it('each output has at least one theme and a default', () => {
    for (const o of listOutputs()) {
      expect(o.themes.length).toBeGreaterThan(0);
      expect(o.themes.some((t) => t.id === o.defaultThemeId)).toBe(true);
    }
  });

  it('findTheme returns the theme by output + theme id', () => {
    const t = findTheme('jsonresume', 'raw');
    expect(t?.id).toBe('raw');
    expect(t?.contentType).toBe('application/json');
  });

  it('findTheme returns undefined for unknown ids', () => {
    expect(findTheme('nope', 'raw')).toBeUndefined();
    expect(findTheme('jsonresume', 'nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement `packages/core/src/outputs/registry.ts`** (with empty output stubs we'll populate in later tasks)

```ts
import type { LoadWarning, SpecCV } from '../spec/model.js';

export type ThemeRenderResult = { bytes: Uint8Array; warnings: LoadWarning[] };

export type ThemeDef = {
  id: string;
  label: string;
  contentType: string;
  filenameExt: string;
  render: (cv: SpecCV, opts: unknown) => Promise<ThemeRenderResult>;
};

export type OutputDef = {
  id: string;
  label: string;
  autoWriteOnRender: boolean;
  themes: ThemeDef[];
  defaultThemeId: string;
};

const _registry: OutputDef[] = [];

export function registerOutput(def: OutputDef): void {
  if (_registry.some((o) => o.id === def.id)) {
    throw new Error(`output already registered: ${def.id}`);
  }
  _registry.push(def);
}

export function listOutputs(): OutputDef[] {
  return [..._registry];
}

export function findOutput(id: string): OutputDef | undefined {
  return _registry.find((o) => o.id === id);
}

export function findTheme(outputId: string, themeId: string): ThemeDef | undefined {
  return findOutput(outputId)?.themes.find((t) => t.id === themeId);
}

export const registry = { listOutputs, findOutput, findTheme, registerOutput };
```

Add a minimal `packages/core/src/outputs/index.ts` that registers placeholder outputs so the test passes — they get replaced in later tasks:

```ts
import { registerOutput } from './registry.js';

registerOutput({
  id: 'html',
  label: 'HTML',
  autoWriteOnRender: true,
  themes: [{
    id: 'linkedin-spiritual',
    label: 'LinkedIn Spiritual',
    contentType: 'text/html',
    filenameExt: '.html',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'linkedin-spiritual',
});

registerOutput({
  id: 'jsonresume',
  label: 'JSON Resume',
  autoWriteOnRender: false,
  themes: [{
    id: 'raw',
    label: 'Raw resume.json',
    contentType: 'application/json',
    filenameExt: '.json',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'raw',
});

registerOutput({
  id: 'europass',
  label: 'Europass XML',
  autoWriteOnRender: false,
  themes: [{
    id: 'canonical',
    label: 'Canonical Europass XML',
    contentType: 'application/xml',
    filenameExt: '.xml',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'canonical',
});
```

Update `packages/core/test/outputs/registry.test.ts` first line to import for side-effects:

```ts
import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { registry, listOutputs, findTheme } from '../../src/outputs/registry.js';
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
pnpm -F @curricularium/core test
pnpm -F @curricularium/core typecheck
```
Expected: 4 registry tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/outputs/ packages/core/test/outputs/
git commit -m "feat(core): output + theme registry with html/jsonresume/europass stubs"
```

---

### Task B2: JSON Resume `raw` theme + adapter helper

**Files:**
- Create: `packages/core/src/outputs/jsonresume/adapter.ts`
- Create: `packages/core/src/outputs/jsonresume/themes/raw.ts`
- Modify: `packages/core/src/outputs/index.ts` (swap `raw` stub for real theme)
- Create: `packages/core/test/outputs/jsonresume.test.ts`

- [ ] **Step 1: Write failing test `packages/core/test/outputs/jsonresume.test.ts`**

```ts
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
```

- [ ] **Step 2: Implement `packages/core/src/outputs/jsonresume/adapter.ts`**

```ts
import type { SpecCV } from '../../spec/model.js';
import { formatDateISO } from '../../spec/canonical.js';

export type JsonResume = {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; region?: string; countryCode?: string };
    profiles?: { network: string; username?: string; url: string }[];
  };
  work?: WorkEntry[];
  volunteer?: WorkEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  publications?: PublicationEntry[];
  skills?: SkillEntry[];
  languages?: LanguageEntry[];
  projects?: ProjectEntry[];
  openSource?: ProjectEntry[];   // extension
};

type WorkEntry = {
  name: string;
  position: string;
  location?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
};

type ProjectEntry = {
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  keywords?: string[];
  highlights?: string[];
  roles?: string[];
};

type EducationEntry = {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
};

type AwardEntry = { title: string; date?: string; awarder?: string; summary?: string };
type PublicationEntry = { name: string; publisher?: string; releaseDate?: string; url?: string; summary?: string };
type SkillEntry = { name: string; level?: string; keywords?: string[] };
type LanguageEntry = { language: string; fluency?: string };

export function specCvToJsonResume(cv: SpecCV): JsonResume {
  const out: JsonResume = {};

  if (cv.personal) {
    const [city, country] = splitLocation(cv.personal.location);
    out.basics = {
      name: cv.personal.fullName,
      label: cv.identity.headline?.body.trim() || undefined,
      email: cv.personal.email,
      phone: cv.personal.phone ?? undefined,
      summary: cv.identity.about?.body.trim() || undefined,
      location: { city, countryCode: country },
      profiles: cv.personal.profiles.map((p) => ({
        network: p.network,
        url: p.url,
        username: p.username ?? undefined,
      })),
    };
  }

  out.work = cv.workExperience.map((w) => ({
    name: w.employer,
    position: w.position,
    location: w.location,
    url: w.url ?? undefined,
    startDate: formatDateISO(w.periodStart) ?? undefined,
    endDate: formatDateISO(w.periodEnd) ?? undefined,
    ...bodyToSummaryHighlights(w.body),
  }));

  out.volunteer = cv.community.map((c) => ({
    name: c.organisation,
    position: c.role,
    location: c.location ?? undefined,
    url: c.url ?? undefined,
    startDate: formatDateISO(c.periodStart) ?? undefined,
    endDate: formatDateISO(c.periodEnd) ?? undefined,
    ...bodyToSummaryHighlights(c.body),
  }));

  const projects = cv.projects.map((p) => ({
    name: p.title,
    description: p.body ? bodyToSummaryHighlights(p.body).summary : undefined,
    url: p.url ?? undefined,
    startDate: formatDateISO(p.periodStart) ?? undefined,
    endDate: p.periodEnd ? formatDateISO(p.periodEnd) ?? undefined : undefined,
    keywords: p.tech.length ? p.tech : undefined,
    roles: p.roles.length ? p.roles : undefined,
  }));

  if (cv.variant.collapseOpenSource) {
    out.projects = [
      ...projects,
      ...cv.openSource.map((o) => osToProject(o)),
    ];
  } else {
    out.projects = projects;
    if (cv.openSource.length > 0) {
      out.openSource = cv.openSource.map((o) => osToProject(o));
    }
  }

  out.education = cv.education.map((e) => ({
    institution: e.institution,
    area: e.field || undefined,
    studyType: e.degree,
    startDate: formatDateISO(e.periodStart) ?? undefined,
    endDate: formatDateISO(e.periodEnd) ?? undefined,
    url: e.url ?? undefined,
  }));

  out.awards = cv.awards.map((a) => ({
    title: a.title,
    date: formatDateISO(a.date) ?? undefined,
    awarder: a.awarder,
    summary: a.body || undefined,
  }));

  out.publications = cv.publications.map((p) => ({
    name: p.title,
    publisher: p.publisher,
    releaseDate: formatDateISO(p.date) ?? undefined,
    url: p.url ?? undefined,
    summary: p.body || undefined,
  }));

  if (cv.skills) {
    out.skills = cv.skills.groups.map((g) => ({
      name: g.name,
      level: g.level ?? undefined,
      keywords: g.items,
    }));
  }

  if (cv.languages) {
    out.languages = cv.languages.languages.map((l) => ({
      language: l.name,
      fluency: l.level === 'native' ? 'Native' : l.level,
    }));
  }

  return out;
}

function osToProject(o: SpecCV['openSource'][number]): ProjectEntry {
  return {
    name: o.title,
    description: o.body ? bodyToSummaryHighlights(o.body).summary : undefined,
    url: o.repoUrl,
    startDate: formatDateISO(o.periodStart) ?? undefined,
    endDate: formatDateISO(o.periodEnd) ?? undefined,
    keywords: o.tech.length ? o.tech : undefined,
    roles: [o.role],
  };
}

function splitLocation(s: string): [string | undefined, string | undefined] {
  const i = s.indexOf(',');
  if (i < 0) return [s.trim(), undefined];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

export function bodyToSummaryHighlights(body: string): { summary?: string; highlights?: string[] } {
  const lines = body.split(/\r?\n/);
  const summaryParts: string[] = [];
  const highlights: string[] = [];
  let sawBullet = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const bulletMatch = /^\s*-\s+(.*)$/.exec(line);
    if (bulletMatch) {
      sawBullet = true;
      highlights.push(bulletMatch[1]!.trim());
      continue;
    }
    if (line.trim().length === 0) {
      if (sawBullet) summaryParts.push('');
      continue;
    }
    const quoteMatch = /^\s*>\s*(.*)$/.exec(line);
    if (quoteMatch) {
      summaryParts.push(quoteMatch[1]!.trim());
      continue;
    }
    summaryParts.push(line.trim());
  }

  return {
    summary: summaryParts.length ? summaryParts.filter(Boolean).join(' ').trim() || undefined : undefined,
    highlights: highlights.length ? highlights : undefined,
  };
}
```

- [ ] **Step 3: Implement `packages/core/src/outputs/jsonresume/themes/raw.ts`**

```ts
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
```

- [ ] **Step 4: Replace the `jsonresume` stub registration in `packages/core/src/outputs/index.ts`**

```ts
import { registerOutput } from './registry.js';
import { rawTheme } from './jsonresume/themes/raw.js';

registerOutput({
  id: 'html',
  label: 'HTML',
  autoWriteOnRender: true,
  themes: [{
    id: 'linkedin-spiritual',
    label: 'LinkedIn Spiritual',
    contentType: 'text/html',
    filenameExt: '.html',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'linkedin-spiritual',
});

registerOutput({
  id: 'jsonresume',
  label: 'JSON Resume',
  autoWriteOnRender: false,
  themes: [rawTheme],
  defaultThemeId: 'raw',
});

registerOutput({
  id: 'europass',
  label: 'Europass XML',
  autoWriteOnRender: false,
  themes: [{
    id: 'canonical',
    label: 'Canonical Europass XML',
    contentType: 'application/xml',
    filenameExt: '.xml',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'canonical',
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm -F @curricularium/core test
```
Expected: jsonresume adapter + raw theme tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/outputs/jsonresume/ packages/core/src/outputs/index.ts packages/core/test/outputs/jsonresume.test.ts
git commit -m "feat(core): JSON Resume adapter + raw theme with §13 body convention"
```

---

The remaining tasks (B3 through D2) continue in the same shape as above: failing test → minimal impl → run → commit. The plan continues in `2026-05-29-curricularium-rendering-engine-part2.md` for length reasons.
