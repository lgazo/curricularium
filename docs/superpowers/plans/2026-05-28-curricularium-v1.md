# Curricularium v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only web app that renders a directory of markdown files (with frontmatter) into a LinkedIn-spiritual HTML CV with a dark sidebar + main column layout, with live preview reload and browser-driven PDF export.

**Architecture:** A pnpm-workspace monorepo containing a single Hono server package. Each request to `/preview` re-parses the active source directory's markdown via `gray-matter` + `marked`, validates with Zod, and renders the typed `CV` model through `hono/jsx` components. A chokidar watcher on the active source broadcasts reload events through SSE to the preview page. Multiple registered source directories are persisted to an XDG config file and switched in the HTMX shell. PDF export is delegated to the browser's print dialog with print-specific CSS.

**Tech Stack:** Node.js, TypeScript (strict), pnpm workspaces, Hono, `@hono/node-server`, `hono/jsx`, HTMX (vendored), `gray-matter`, `marked`, `zod`, `chokidar`, `tsx` (dev runner), hand-written CSS.

**Reference spec:** `docs/superpowers/specs/2026-05-28-curricularium-design.md`

**No automated tests in v1** (spec §12). Each task verifies via TypeScript type-check and, where useful, a short manual probe against the running server. A final smoke-test checklist sits at the end of this plan.

**Source schema is provisional.** Another session is defining the real markdown schema. Build against the placeholder shape defined in Task 4 / Task 12; expect updates later.

---

## File Plan

Files this plan will create (relative to repo root):

| Path | Responsibility |
|------|----------------|
| `package.json` | Root workspace manifest + dev scripts |
| `pnpm-workspace.yaml` | Declares `packages/*` |
| `tsconfig.base.json` | Shared TS strict config |
| `.npmrc` | pnpm settings (strict-peer-dependencies, etc.) |
| `.gitignore` | Already exists; extend if needed |
| `packages/server/package.json` | Server package manifest |
| `packages/server/tsconfig.json` | Server TS config, extends base |
| `packages/server/README.md` | Trust boundary, run instructions |
| `packages/server/scripts/vendor-htmx.mjs` | One-shot script to vendor `htmx.min.js` |
| `packages/server/src/index.ts` | App entry — boot config, server, watcher |
| `packages/server/src/config.ts` | XDG config load/save |
| `packages/server/src/sources.ts` | CRUD + active source helpers |
| `packages/server/src/model.ts` | `CV` type + Zod schema |
| `packages/server/src/parse/markdown.ts` | `marked` configuration + frontmatter helper |
| `packages/server/src/parse/profile.ts` | Parse `profile.md` |
| `packages/server/src/parse/about.ts` | Parse `about.md` |
| `packages/server/src/parse/experience.ts` | Parse `experience/*.md` |
| `packages/server/src/parse/education.ts` | Parse `education/*.md` |
| `packages/server/src/parse/skills.ts` | Parse `skills.md` |
| `packages/server/src/parse/index.ts` | `loadSource(dir)` assembles full `CV` |
| `packages/server/src/render/Layout.tsx` | HTML doc shell |
| `packages/server/src/render/Shell.tsx` | `GET /` UI shell (source picker + iframe) |
| `packages/server/src/render/CV.tsx` | Composes Sidebar + Main |
| `packages/server/src/render/Sidebar.tsx` | Photo, name, headline, contact, skills |
| `packages/server/src/render/Main.tsx` | About + experience + education |
| `packages/server/src/render/ExperienceItem.tsx` | One experience entry |
| `packages/server/src/render/EducationItem.tsx` | One education entry |
| `packages/server/src/render/ErrorBanner.tsx` | Inline error banner for parse failures |
| `packages/server/src/routes/index.ts` | Mounts all routes |
| `packages/server/src/routes/shell.tsx` | `GET /` |
| `packages/server/src/routes/sources.tsx` | Source CRUD + activate (HTMX fragments) |
| `packages/server/src/routes/preview.tsx` | `GET /preview` |
| `packages/server/src/routes/asset.ts` | `GET /source-asset/*` |
| `packages/server/src/routes/events.ts` | `GET /events` (SSE) |
| `packages/server/src/sse.ts` | SSE connection registry + broadcast helper |
| `packages/server/src/watcher.ts` | chokidar wrapper that calls SSE broadcaster |
| `packages/server/src/static/styles.css` | App + CV CSS, with print rules |
| `packages/server/src/static/htmx.min.js` | Vendored by setup script (not hand-edited) |
| `packages/server/fixtures/sample-cv/...` | Smoke-test fixture source |

---

## Task 1: Initialize pnpm workspace

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.npmrc`
- Modify: `.gitignore`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "curricularium",
  "private": true,
  "version": "0.0.0",
  "description": "Local markdown-to-CV web app",
  "type": "module",
  "scripts": {
    "dev": "pnpm -F @curricularium/server dev",
    "typecheck": "pnpm -r typecheck",
    "vendor:htmx": "pnpm -F @curricularium/server vendor:htmx"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "verbatimModuleSyntax": false,
    "allowSyntheticDefaultImports": true
  }
}
```

- [ ] **Step 4: Create `.npmrc`**

```
strict-peer-dependencies=true
auto-install-peers=true
```

- [ ] **Step 5: Extend `.gitignore` (only if entries missing)**

The existing `.gitignore` already covers `node_modules/`, `dist/`, `.superpowers/`. If `packages/*/dist/` ever appears, it is already covered by `dist/`. No change needed unless an entry is missing — leave the file untouched if it is.

- [ ] **Step 6: Verify workspace skeleton**

Run: `pnpm install`
Expected: `Done in <Xs>` with no errors (zero workspaces have manifests yet aside from root).

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .npmrc
git commit -m "chore: scaffold pnpm workspace and shared TS config"
```

---

## Task 2: Scaffold the server package

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`

- [ ] **Step 1: Create `packages/server/package.json`**

```json
{
  "name": "@curricularium/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "vendor:htmx": "node scripts/vendor-htmx.mjs"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "chokidar": "^3.6.0",
    "gray-matter": "^4.0.3",
    "hono": "^4.6.0",
    "htmx.org": "^1.9.12",
    "marked": "^14.0.0",
    "ulid": "^2.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: pnpm installs into `node_modules/` and creates a `pnpm-lock.yaml`. No peer-dep errors.

- [ ] **Step 4: Run typecheck baseline**

Run: `pnpm -F @curricularium/server typecheck`
Expected: passes with no source files (nothing in `src/` yet). If it errors with "No inputs were found", that is fine — proceed to next task. Alternatively, create a placeholder `src/index.ts` with `export {};` temporarily; remove later when Task 28 writes the real entry. For simplicity, write the temp placeholder now:

Create `packages/server/src/index.ts` with body `export {};` so `tsc --noEmit` passes.

- [ ] **Step 5: Commit**

```bash
git add packages/server/package.json packages/server/tsconfig.json packages/server/src/index.ts pnpm-lock.yaml
git commit -m "chore(server): scaffold server package and dependencies"
```

---

## Task 3: Vendor HTMX

**Files:**
- Create: `packages/server/scripts/vendor-htmx.mjs`
- Create: `packages/server/src/static/htmx.min.js` (produced by running the script; commit the result)

- [ ] **Step 1: Create `packages/server/scripts/vendor-htmx.mjs`**

```js
import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const src = resolve(pkgRoot, 'node_modules/htmx.org/dist/htmx.min.js');
const dest = resolve(pkgRoot, 'src/static/htmx.min.js');

await mkdir(dirname(dest), { recursive: true });
await cp(src, dest);
console.log(`Vendored htmx.min.js → ${dest}`);
```

- [ ] **Step 2: Run the vendor script**

Run: `pnpm -F @curricularium/server vendor:htmx`
Expected: `Vendored htmx.min.js → .../packages/server/src/static/htmx.min.js`

- [ ] **Step 3: Confirm the file is present**

Run: `ls -la packages/server/src/static/htmx.min.js`
Expected: a file > 30 KB.

- [ ] **Step 4: Commit**

```bash
git add packages/server/scripts/vendor-htmx.mjs packages/server/src/static/htmx.min.js
git commit -m "chore(server): add htmx vendor script and vendored bundle"
```

---

## Task 4: Define the CV typed model

**Files:**
- Create: `packages/server/src/model.ts`

- [ ] **Step 1: Create `packages/server/src/model.ts`**

```ts
import { z } from 'zod';

export const ContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

export const ProfileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  photo: z.string().optional(),
  location: z.string().optional(),
  contact: ContactSchema.default({}),
});

export const ExperienceEntrySchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  start: z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM'),
  end: z.union([
    z.string().regex(/^\d{4}-\d{2}$/),
    z.literal('Present'),
  ]),
  bullets: z.array(z.string()).default([]),
});

export const EducationEntrySchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  start: z.string().regex(/^\d{4}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}$/),
  notes: z.string().optional(),
});

export const SkillsGroupSchema = z.object({
  group: z.string().optional(),
  items: z.array(z.string()).min(1),
});

export const CVSchema = z.object({
  profile: ProfileSchema,
  about: z.string().optional(),
  experience: z.array(ExperienceEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  skills: z.array(SkillsGroupSchema).default([]),
});

export type CV = z.infer<typeof CVSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type SkillsGroup = z.infer<typeof SkillsGroupSchema>;

export type ParseError = {
  file: string;
  message: string;
  field?: string;
};

export type ParseResult =
  | { ok: true; cv: CV; warnings: ParseError[] }
  | { ok: false; errors: ParseError[] };
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/model.ts
git commit -m "feat(server): add CV typed model and Zod schemas"
```

---

## Task 5: Markdown parser core

**Files:**
- Create: `packages/server/src/parse/markdown.ts`

- [ ] **Step 1: Create `packages/server/src/parse/markdown.ts`**

```ts
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { Marked } from 'marked';

const md = new Marked({ gfm: true, breaks: false });

export type FrontmatterFile = {
  path: string;
  data: Record<string, unknown>;
  body: string;
};

export async function readMarkdownFile(path: string): Promise<FrontmatterFile> {
  const raw = await readFile(path, 'utf8');
  const parsed = matter(raw);
  return {
    path,
    data: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}

export function renderMarkdown(body: string): string {
  return md.parse(body) as string;
}

export function splitBulletList(body: string): string[] {
  // Treat top-level list items as bullets; non-list lines are joined and
  // wrapped as a paragraph bullet so authors can choose either style.
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

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/markdown.ts
git commit -m "feat(server): add markdown reader, renderer, and bullet splitter"
```

---

## Task 6: Parse `profile.md`

**Files:**
- Create: `packages/server/src/parse/profile.ts`

- [ ] **Step 1: Create `packages/server/src/parse/profile.ts`**

```ts
import { join } from 'node:path';
import { ProfileSchema, type ParseError, type Profile } from '../model.js';
import { readMarkdownFile } from './markdown.js';

export async function parseProfile(
  sourceDir: string,
): Promise<{ profile: Profile } | { errors: ParseError[] }> {
  const path = join(sourceDir, 'profile.md');
  let file;
  try {
    file = await readMarkdownFile(path);
  } catch (err) {
    return {
      errors: [{ file: path, message: `profile.md not found or unreadable: ${(err as Error).message}` }],
    };
  }
  const parsed = ProfileSchema.safeParse(file.data);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => ({
        file: path,
        field: i.path.join('.'),
        message: i.message,
      })),
    };
  }
  return { profile: parsed.data };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/profile.ts
git commit -m "feat(server): parse profile.md frontmatter"
```

---

## Task 7: Parse `about.md`

**Files:**
- Create: `packages/server/src/parse/about.ts`

- [ ] **Step 1: Create `packages/server/src/parse/about.ts`**

```ts
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readMarkdownFile, renderMarkdown } from './markdown.js';

export async function parseAbout(sourceDir: string): Promise<string | undefined> {
  const path = join(sourceDir, 'about.md');
  if (!existsSync(path)) return undefined;
  const file = await readMarkdownFile(path);
  const body = file.body.trim();
  if (!body) return undefined;
  return renderMarkdown(body);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/about.ts
git commit -m "feat(server): parse about.md body to HTML"
```

---

## Task 8: Parse `experience/*.md`

**Files:**
- Create: `packages/server/src/parse/experience.ts`

- [ ] **Step 1: Create `packages/server/src/parse/experience.ts`**

```ts
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ExperienceEntrySchema,
  type ExperienceEntry,
  type ParseError,
} from '../model.js';
import { readMarkdownFile, splitBulletList } from './markdown.js';

export async function parseExperience(
  sourceDir: string,
): Promise<{ entries: ExperienceEntry[]; errors: ParseError[] }> {
  const dir = join(sourceDir, 'experience');
  if (!existsSync(dir)) return { entries: [], errors: [] };

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));

  const errors: ParseError[] = [];
  const entries: ExperienceEntry[] = [];

  for (const path of files) {
    const file = await readMarkdownFile(path);
    const candidate = { ...file.data, bullets: splitBulletList(file.body) };
    const parsed = ExperienceEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        errors.push({ file: path, field: i.path.join('.'), message: i.message });
      }
      continue;
    }
    entries.push(parsed.data);
  }

  entries.sort((a, b) => b.start.localeCompare(a.start));
  return { entries, errors };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/experience.ts
git commit -m "feat(server): parse experience/*.md with sort and bullet split"
```

---

## Task 9: Parse `education/*.md`

**Files:**
- Create: `packages/server/src/parse/education.ts`

- [ ] **Step 1: Create `packages/server/src/parse/education.ts`**

```ts
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EducationEntrySchema,
  type EducationEntry,
  type ParseError,
} from '../model.js';
import { readMarkdownFile, renderMarkdown } from './markdown.js';

export async function parseEducation(
  sourceDir: string,
): Promise<{ entries: EducationEntry[]; errors: ParseError[] }> {
  const dir = join(sourceDir, 'education');
  if (!existsSync(dir)) return { entries: [], errors: [] };

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));

  const errors: ParseError[] = [];
  const entries: EducationEntry[] = [];

  for (const path of files) {
    const file = await readMarkdownFile(path);
    const notes = file.body.trim() ? renderMarkdown(file.body) : undefined;
    const candidate = { ...file.data, ...(notes ? { notes } : {}) };
    const parsed = EducationEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        errors.push({ file: path, field: i.path.join('.'), message: i.message });
      }
      continue;
    }
    entries.push(parsed.data);
  }

  entries.sort((a, b) => b.start.localeCompare(a.start));
  return { entries, errors };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/education.ts
git commit -m "feat(server): parse education/*.md with sort and notes"
```

---

## Task 10: Parse `skills.md`

**Files:**
- Create: `packages/server/src/parse/skills.ts`

- [ ] **Step 1: Create `packages/server/src/parse/skills.ts`**

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  SkillsGroupSchema,
  type ParseError,
  type SkillsGroup,
} from '../model.js';
import { readMarkdownFile } from './markdown.js';

const FrontmatterSchema = z.union([
  z.object({ groups: z.array(SkillsGroupSchema).min(1) }),
  z.object({ items: z.array(z.string()).min(1) }),
]);

export async function parseSkills(
  sourceDir: string,
): Promise<{ skills: SkillsGroup[]; errors: ParseError[] }> {
  const path = join(sourceDir, 'skills.md');
  if (!existsSync(path)) return { skills: [], errors: [] };

  const file = await readMarkdownFile(path);
  const parsed = FrontmatterSchema.safeParse(file.data);
  if (!parsed.success) {
    return {
      skills: [],
      errors: parsed.error.issues.map((i) => ({
        file: path,
        field: i.path.join('.'),
        message: i.message,
      })),
    };
  }

  const data = parsed.data;
  if ('groups' in data) return { skills: data.groups, errors: [] };
  return { skills: [{ items: data.items }], errors: [] };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/skills.ts
git commit -m "feat(server): parse skills.md frontmatter (flat or grouped)"
```

---

## Task 11: Assemble full CV via `loadSource`

**Files:**
- Create: `packages/server/src/parse/index.ts`

- [ ] **Step 1: Create `packages/server/src/parse/index.ts`**

```ts
import { CVSchema, type ParseError, type ParseResult } from '../model.js';
import { parseAbout } from './about.js';
import { parseEducation } from './education.js';
import { parseExperience } from './experience.js';
import { parseProfile } from './profile.js';
import { parseSkills } from './skills.js';

export async function loadSource(dir: string): Promise<ParseResult> {
  const profileResult = await parseProfile(dir);
  if ('errors' in profileResult) return { ok: false, errors: profileResult.errors };

  const about = await parseAbout(dir);
  const experience = await parseExperience(dir);
  const education = await parseEducation(dir);
  const skills = await parseSkills(dir);

  const errors: ParseError[] = [
    ...experience.errors,
    ...education.errors,
    ...skills.errors,
  ];

  const candidate = {
    profile: profileResult.profile,
    about,
    experience: experience.entries,
    education: education.entries,
    skills: skills.skills,
  };

  const parsed = CVSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: [
        ...errors,
        ...parsed.error.issues.map((i) => ({
          file: dir,
          field: i.path.join('.'),
          message: i.message,
        })),
      ],
    };
  }

  return { ok: true, cv: parsed.data, warnings: errors };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/parse/index.ts
git commit -m "feat(server): assemble CV with loadSource()"
```

---

## Task 12: Sample fixture for manual smoke test

**Files:**
- Create: `packages/server/fixtures/sample-cv/profile.md`
- Create: `packages/server/fixtures/sample-cv/about.md`
- Create: `packages/server/fixtures/sample-cv/experience/2021-acme.md`
- Create: `packages/server/fixtures/sample-cv/experience/2018-globex.md`
- Create: `packages/server/fixtures/sample-cv/education/2014-mit.md`
- Create: `packages/server/fixtures/sample-cv/skills.md`

- [ ] **Step 1: Create `profile.md`**

```markdown
---
name: Jane Doe
headline: Senior Software Engineer
location: Berlin, Germany
contact:
  email: jane@example.com
  website: https://janedoe.dev
  linkedin: janedoe
  github: janedoe
---
```

- [ ] **Step 2: Create `about.md`**

```markdown
Engineer focused on resilient distributed systems and developer
tooling. Comfortable across the stack but happiest near the data
plane.
```

- [ ] **Step 3: Create `experience/2021-acme.md`**

```markdown
---
company: Acme Corp
title: Tech Lead
location: Berlin
start: 2021-04
end: Present
---

- Led the platform team rebuilding the ingestion pipeline (Go, Kafka).
- Cut p99 ingest latency by 60% by redesigning the batch flush loop.
- Mentored four engineers from mid to senior.
```

- [ ] **Step 4: Create `experience/2018-globex.md`**

```markdown
---
company: Globex
title: Senior Software Engineer
location: Munich
start: 2018-09
end: 2021-03
---

- Owned the billing service rewrite (Node.js → Rust).
- Designed the rate-limit policy now used by every public API.
```

- [ ] **Step 5: Create `education/2014-mit.md`**

```markdown
---
school: MIT
degree: B.Sc.
field: Computer Science
start: 2010-09
end: 2014-06
---
```

- [ ] **Step 6: Create `skills.md`**

```markdown
---
groups:
  - group: Languages
    items: [TypeScript, Go, Rust, Python]
  - group: Infrastructure
    items: [Kubernetes, Terraform, Kafka]
---
```

- [ ] **Step 7: Commit**

```bash
git add packages/server/fixtures/sample-cv
git commit -m "test(server): add sample-cv fixture for smoke testing"
```

---

## Task 13: XDG config module

**Files:**
- Create: `packages/server/src/config.ts`

- [ ] **Step 1: Create `packages/server/src/config.ts`**

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';

export const SourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  addedAt: z.string(),
});

export const ConfigSchema = z.object({
  sources: z.array(SourceSchema).default([]),
  activeSourceId: z.string().nullable().default(null),
});

export type Source = z.infer<typeof SourceSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export function configFilePath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.config');
  return join(base, 'curricularium', 'config.json');
}

export async function loadConfig(): Promise<Config> {
  const path = configFilePath();
  if (!existsSync(path)) return { sources: [], activeSourceId: null };
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { sources: [], activeSourceId: null };
  }
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) return { sources: [], activeSourceId: null };
  return result.data;
}

export async function saveConfig(config: Config): Promise<void> {
  const path = configFilePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/config.ts
git commit -m "feat(server): XDG config load/save"
```

---

## Task 14: Sources module (CRUD + active source)

**Files:**
- Create: `packages/server/src/sources.ts`

- [ ] **Step 1: Create `packages/server/src/sources.ts`**

```ts
import { existsSync, statSync, accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { ulid } from 'ulid';
import { loadConfig, saveConfig, type Config, type Source } from './config.js';

export type AddSourceInput = { name: string; path: string };
export type AddSourceResult =
  | { ok: true; source: Source; config: Config }
  | { ok: false; message: string };

function validateSourcePath(path: string): string | null {
  if (!existsSync(path)) return 'path does not exist';
  let stats;
  try {
    stats = statSync(path);
  } catch (err) {
    return `cannot stat path: ${(err as Error).message}`;
  }
  if (!stats.isDirectory()) return 'path is not a directory';
  try {
    accessSync(path, constants.R_OK);
  } catch {
    return 'path is not readable';
  }
  if (!existsSync(join(path, 'profile.md'))) return 'directory is missing profile.md';
  return null;
}

export async function addSource(input: AddSourceInput): Promise<AddSourceResult> {
  const name = input.name.trim();
  const path = input.path.trim();
  if (!name) return { ok: false, message: 'name is required' };
  if (!path) return { ok: false, message: 'path is required' };
  const error = validateSourcePath(path);
  if (error) return { ok: false, message: error };

  const config = await loadConfig();
  const source: Source = {
    id: ulid(),
    name,
    path,
    addedAt: new Date().toISOString(),
  };
  const next: Config = {
    sources: [...config.sources, source],
    activeSourceId: config.activeSourceId ?? source.id,
  };
  await saveConfig(next);
  return { ok: true, source, config: next };
}

export async function removeSource(id: string): Promise<Config> {
  const config = await loadConfig();
  const sources = config.sources.filter((s) => s.id !== id);
  const activeSourceId =
    config.activeSourceId === id ? (sources[0]?.id ?? null) : config.activeSourceId;
  const next: Config = { sources, activeSourceId };
  await saveConfig(next);
  return next;
}

export async function activateSource(id: string): Promise<Config> {
  const config = await loadConfig();
  if (!config.sources.some((s) => s.id === id)) return config;
  const next: Config = { ...config, activeSourceId: id };
  await saveConfig(next);
  return next;
}

export async function getActiveSource(): Promise<Source | null> {
  const config = await loadConfig();
  if (!config.activeSourceId) return null;
  return config.sources.find((s) => s.id === config.activeSourceId) ?? null;
}

export function sourceAvailability(source: Source): 'ok' | 'missing' | 'unreadable' {
  if (!existsSync(source.path)) return 'missing';
  try {
    accessSync(source.path, constants.R_OK);
  } catch {
    return 'unreadable';
  }
  return 'ok';
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/sources.ts
git commit -m "feat(server): sources CRUD with active source helpers"
```

---

## Task 15: SSE connection registry

**Files:**
- Create: `packages/server/src/sse.ts`

- [ ] **Step 1: Create `packages/server/src/sse.ts`**

```ts
export type SSEEvent =
  | { event: 'reload'; data?: Record<string, unknown> }
  | { event: 'error'; data: { message: string; file?: string } };

type Client = {
  send: (event: SSEEvent) => void | Promise<void>;
};

const clients = new Set<Client>();

export function addClient(client: Client): () => void {
  clients.add(client);
  return () => clients.delete(client);
}

export function broadcast(message: SSEEvent): void {
  for (const client of clients) {
    try {
      void client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
```

Note: `sse.ts` stores the typed event object only. The route handler is responsible for serializing it through Hono's `writeSSE`. This avoids double-encoding the SSE framing.

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/sse.ts
git commit -m "feat(server): SSE client registry with broadcast helper"
```

---

## Task 16: File watcher

**Files:**
- Create: `packages/server/src/watcher.ts`

- [ ] **Step 1: Create `packages/server/src/watcher.ts`**

```ts
import chokidar, { type FSWatcher } from 'chokidar';
import { broadcast } from './sse.js';

let active: FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function startWatching(path: string): void {
  stopWatching();
  active = chokidar.watch(path, {
    ignored: /(^|[\\/])\../,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 25 },
  });
  const fire = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => broadcast({ event: 'reload' }), 150);
  };
  active.on('add', fire);
  active.on('change', fire);
  active.on('unlink', fire);
}

export function stopWatching(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (active) {
    void active.close();
    active = null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/watcher.ts
git commit -m "feat(server): chokidar watcher with debounced SSE broadcast"
```

---

## Task 17: Layout component

**Files:**
- Create: `packages/server/src/render/Layout.tsx`

- [ ] **Step 1: Create `packages/server/src/render/Layout.tsx`**

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx';

export const Layout: FC<PropsWithChildren<{ title: string; sseClient?: boolean }>> = ({
  title,
  sseClient,
  children,
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href="/static/styles.css" />
      <script src="/static/htmx.min.js"></script>
      {sseClient ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const es = new EventSource('/events');
              es.addEventListener('reload', () => location.reload());
              es.addEventListener('error', () => {});
            `,
          }}
        />
      ) : null}
    </head>
    <body>{children}</body>
  </html>
);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/render/Layout.tsx
git commit -m "feat(server): Layout component (HTML shell with optional SSE client)"
```

---

## Task 18: Sidebar component

**Files:**
- Create: `packages/server/src/render/Sidebar.tsx`

- [ ] **Step 1: Create `packages/server/src/render/Sidebar.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { Profile, SkillsGroup } from '../model.js';

type Props = { profile: Profile; skills: SkillsGroup[] };

export const Sidebar: FC<Props> = ({ profile, skills }) => {
  const { contact } = profile;
  return (
    <aside class="cv-sidebar">
      {profile.photo ? (
        <img
          class="cv-photo"
          src={`/source-asset/${encodeURI(profile.photo)}`}
          alt={profile.name}
        />
      ) : (
        <div class="cv-photo cv-photo--placeholder" aria-hidden="true" />
      )}
      <h1 class="cv-name">{profile.name}</h1>
      <p class="cv-headline">{profile.headline}</p>
      {profile.location ? <p class="cv-location">{profile.location}</p> : null}

      <section class="cv-contact">
        <h2 class="cv-section-label">Contact</h2>
        <ul>
          {contact.email ? <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li> : null}
          {contact.phone ? <li>{contact.phone}</li> : null}
          {contact.website ? <li><a href={contact.website}>{contact.website}</a></li> : null}
          {contact.linkedin ? <li>LinkedIn: {contact.linkedin}</li> : null}
          {contact.github ? <li>GitHub: {contact.github}</li> : null}
        </ul>
      </section>

      {skills.length > 0 ? (
        <section class="cv-skills">
          <h2 class="cv-section-label">Skills</h2>
          {skills.map((group) => (
            <div class="cv-skill-group">
              {group.group ? <h3 class="cv-skill-group-name">{group.group}</h3> : null}
              <ul class="cv-chips">
                {group.items.map((item) => (
                  <li class="cv-chip">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/render/Sidebar.tsx
git commit -m "feat(server): Sidebar component (photo, name, contact, skills)"
```

---

## Task 19: Experience + Education item components

**Files:**
- Create: `packages/server/src/render/ExperienceItem.tsx`
- Create: `packages/server/src/render/EducationItem.tsx`

- [ ] **Step 1: Create `packages/server/src/render/ExperienceItem.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { ExperienceEntry } from '../model.js';

export const ExperienceItem: FC<{ entry: ExperienceEntry }> = ({ entry }) => (
  <article class="cv-experience-item">
    <header>
      <h3 class="cv-role">{entry.title}</h3>
      <p class="cv-company">
        {entry.company}
        {entry.location ? <span class="cv-location-inline"> · {entry.location}</span> : null}
      </p>
      <p class="cv-dates">
        {entry.start} — {entry.end}
      </p>
    </header>
    {entry.bullets.length > 0 ? (
      <ul class="cv-bullets">
        {entry.bullets.map((html) => (
          <li dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </ul>
    ) : null}
  </article>
);
```

- [ ] **Step 2: Create `packages/server/src/render/EducationItem.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { EducationEntry } from '../model.js';

export const EducationItem: FC<{ entry: EducationEntry }> = ({ entry }) => (
  <article class="cv-education-item">
    <header>
      <h3 class="cv-degree">
        {entry.degree}
        {entry.field ? <span> · {entry.field}</span> : null}
      </h3>
      <p class="cv-school">{entry.school}</p>
      <p class="cv-dates">
        {entry.start} — {entry.end}
      </p>
    </header>
    {entry.notes ? <div class="cv-notes" dangerouslySetInnerHTML={{ __html: entry.notes }} /> : null}
  </article>
);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/render/ExperienceItem.tsx packages/server/src/render/EducationItem.tsx
git commit -m "feat(server): ExperienceItem and EducationItem components"
```

---

## Task 20: Main component

**Files:**
- Create: `packages/server/src/render/Main.tsx`

- [ ] **Step 1: Create `packages/server/src/render/Main.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { CV } from '../model.js';
import { ExperienceItem } from './ExperienceItem.js';
import { EducationItem } from './EducationItem.js';

export const Main: FC<{ cv: CV }> = ({ cv }) => (
  <main class="cv-main">
    {cv.about ? (
      <section class="cv-about">
        <h2 class="cv-section-title">About</h2>
        <div dangerouslySetInnerHTML={{ __html: cv.about }} />
      </section>
    ) : null}

    {cv.experience.length > 0 ? (
      <section class="cv-experience">
        <h2 class="cv-section-title">Experience</h2>
        {cv.experience.map((entry) => (
          <ExperienceItem entry={entry} />
        ))}
      </section>
    ) : null}

    {cv.education.length > 0 ? (
      <section class="cv-education">
        <h2 class="cv-section-title">Education</h2>
        {cv.education.map((entry) => (
          <EducationItem entry={entry} />
        ))}
      </section>
    ) : null}
  </main>
);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/render/Main.tsx
git commit -m "feat(server): Main component composes about + experience + education"
```

---

## Task 21: CV root + ErrorBanner

**Files:**
- Create: `packages/server/src/render/CV.tsx`
- Create: `packages/server/src/render/ErrorBanner.tsx`

- [ ] **Step 1: Create `packages/server/src/render/ErrorBanner.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { ParseError } from '../model.js';

export const ErrorBanner: FC<{ errors: ParseError[] }> = ({ errors }) => (
  <div class="cv-error-banner" role="alert">
    <p class="cv-error-title">Could not render CV</p>
    <ul>
      {errors.map((e) => (
        <li>
          <code>{e.file}</code>
          {e.field ? <span class="cv-error-field"> · {e.field}</span> : null}
          <span class="cv-error-message"> — {e.message}</span>
        </li>
      ))}
    </ul>
  </div>
);
```

- [ ] **Step 2: Create `packages/server/src/render/CV.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { CV as CVData } from '../model.js';
import { Sidebar } from './Sidebar.js';
import { Main } from './Main.js';

export const CV: FC<{ cv: CVData }> = ({ cv }) => (
  <div class="cv-page">
    <Sidebar profile={cv.profile} skills={cv.skills} />
    <Main cv={cv} />
  </div>
);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/render/CV.tsx packages/server/src/render/ErrorBanner.tsx
git commit -m "feat(server): CV root component and ErrorBanner"
```

---

## Task 22: Shell component

**Files:**
- Create: `packages/server/src/render/Shell.tsx`

- [ ] **Step 1: Create `packages/server/src/render/Shell.tsx`**

```tsx
import type { FC } from 'hono/jsx';
import type { Source } from '../config.js';

type Props = {
  sources: Source[];
  activeSourceId: string | null;
  availability: Record<string, 'ok' | 'missing' | 'unreadable'>;
};

export const Shell: FC<Props> = ({ sources, activeSourceId, availability }) => (
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
          {sources.map((s) => (
            <li class={`source-row${s.id === activeSourceId ? ' source-row--active' : ''}`}>
              <span class={`source-status source-status--${availability[s.id] ?? 'ok'}`} />
              <div class="source-meta">
                <strong>{s.name}</strong>
                <code>{s.path}</code>
              </div>
              <div class="source-actions">
                {availability[s.id] === 'ok' && s.id !== activeSourceId ? (
                  <button
                    type="button"
                    hx-post={`/sources/${s.id}/activate`}
                    hx-target="body"
                    hx-swap="outerHTML"
                  >
                    Activate
                  </button>
                ) : null}
                <button
                  type="button"
                  hx-delete={`/sources/${s.id}`}
                  hx-target="body"
                  hx-swap="outerHTML"
                  hx-confirm="Remove this source?"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form
          class="add-source"
          hx-post="/sources"
          hx-target="body"
          hx-swap="outerHTML"
        >
          <h3>Add source</h3>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Path
            <input name="path" required placeholder="/absolute/path/to/cv-md" />
          </label>
          <button type="submit">Add</button>
        </form>
      </section>
    </aside>

    <section class="shell-preview">
      {activeSourceId ? (
        <iframe id="preview-frame" src="/preview" title="CV preview" />
      ) : (
        <div class="shell-empty">No source active. Add or activate one on the left.</div>
      )}
    </section>
  </div>
);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/render/Shell.tsx
git commit -m "feat(server): Shell component (source picker + preview iframe)"
```

---

## Task 23: Static stylesheet

**Files:**
- Create: `packages/server/src/static/styles.css`

- [ ] **Step 1: Create `packages/server/src/static/styles.css`**

```css
:root {
  --sidebar-bg: #1e293b;
  --sidebar-fg: #e2e8f0;
  --sidebar-muted: #94a3b8;
  --accent: #0ea5e9;
  --main-bg: #ffffff;
  --main-fg: #0f172a;
  --rule: #e2e8f0;
  --font-body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-display: "Inter", var(--font-body);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: var(--font-body); color: var(--main-fg); background: #f1f5f9; }

/* ---------- Shell ---------- */
.shell {
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "header header" "aside preview";
  min-height: 100vh;
}
.shell-header {
  grid-area: header;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #0f172a; color: #e2e8f0;
}
.shell-title { font-size: 18px; margin: 0; }
.shell-print {
  background: var(--accent); color: white; border: 0; padding: 8px 14px;
  border-radius: 6px; cursor: pointer; font-weight: 600;
}
.shell-aside { grid-area: aside; background: #f8fafc; border-right: 1px solid var(--rule); padding: 20px; overflow-y: auto; }
.shell-preview { grid-area: preview; }
.shell-preview iframe { width: 100%; height: 100%; border: 0; background: white; }
.shell-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b; }

.shell-sources h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-top: 0; }
#source-list { list-style: none; padding: 0; margin: 0 0 24px; }
.source-row { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--rule); border-radius: 6px; margin-bottom: 8px; background: white; }
.source-row--active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.source-status { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
.source-status--missing, .source-status--unreadable { background: #ef4444; }
.source-meta strong { display: block; font-size: 13px; }
.source-meta code { font-size: 11px; color: #64748b; }
.source-actions { display: flex; gap: 6px; }
.source-actions button { font-size: 12px; padding: 4px 8px; border: 1px solid var(--rule); background: white; border-radius: 4px; cursor: pointer; }

.add-source { display: grid; gap: 8px; padding: 14px; border: 1px dashed var(--rule); border-radius: 6px; }
.add-source label { display: grid; gap: 4px; font-size: 12px; color: #475569; }
.add-source input { padding: 6px 8px; border: 1px solid var(--rule); border-radius: 4px; font-size: 13px; }
.add-source button { background: var(--accent); color: white; border: 0; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 600; }
.add-source-error { color: #b91c1c; font-size: 12px; }

/* ---------- CV ---------- */
.cv-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
  background: var(--main-bg);
  color: var(--main-fg);
}
.cv-sidebar {
  background: var(--sidebar-bg);
  color: var(--sidebar-fg);
  padding: 32px 24px;
}
.cv-photo {
  width: 120px; height: 120px; border-radius: 50%;
  object-fit: cover; background: #475569; display: block;
}
.cv-photo--placeholder { background: linear-gradient(135deg, #475569, #334155); }
.cv-name { font-family: var(--font-display); font-size: 22px; margin: 16px 0 4px; color: white; }
.cv-headline { color: var(--sidebar-fg); margin: 0 0 4px; font-weight: 600; }
.cv-location { color: var(--sidebar-muted); margin: 0 0 24px; font-size: 13px; }
.cv-section-label { text-transform: uppercase; letter-spacing: 1.5px; font-size: 11px; color: var(--sidebar-muted); margin: 24px 0 8px; font-weight: 700; }
.cv-contact ul { list-style: none; padding: 0; margin: 0; font-size: 13px; }
.cv-contact li { margin-bottom: 4px; word-break: break-all; }
.cv-contact a { color: var(--sidebar-fg); text-decoration: none; }
.cv-contact a:hover { text-decoration: underline; }
.cv-skill-group-name { font-size: 12px; color: var(--sidebar-fg); margin: 12px 0 6px; font-weight: 600; }
.cv-chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.cv-chip { background: rgba(255, 255, 255, 0.08); color: var(--sidebar-fg); padding: 4px 10px; border-radius: 999px; font-size: 12px; }

.cv-main { padding: 32px 40px; }
.cv-section-title { font-family: var(--font-display); font-size: 18px; margin: 24px 0 12px; border-bottom: 2px solid var(--rule); padding-bottom: 4px; }
.cv-main section:first-of-type .cv-section-title { margin-top: 0; }

.cv-experience-item, .cv-education-item { margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid; }
.cv-role, .cv-degree { margin: 0; font-size: 15px; }
.cv-company, .cv-school { margin: 2px 0; font-weight: 600; color: #334155; }
.cv-dates { margin: 0 0 8px; color: #64748b; font-size: 12px; }
.cv-bullets { margin: 6px 0 0; padding-left: 18px; }
.cv-bullets li { margin: 4px 0; }
.cv-notes { margin-top: 6px; color: #334155; font-size: 14px; }

.cv-error-banner { background: #fee2e2; color: #7f1d1d; padding: 16px 20px; border-bottom: 2px solid #ef4444; }
.cv-error-title { font-weight: 700; margin: 0 0 8px; }
.cv-error-banner ul { margin: 0; padding-left: 18px; }
.cv-error-field { color: #991b1b; }

/* ---------- Print ---------- */
@page { size: A4; margin: 12mm; }
@media print {
  body, html { background: white; }
  .no-print { display: none !important; }
  .shell { display: block; }
  .shell-preview iframe { height: auto; }
  .cv-page { min-height: auto; }
  .cv-sidebar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cv-section-title, .cv-experience-item header, .cv-education-item header { break-after: avoid; page-break-after: avoid; }
  a { color: inherit; text-decoration: none; }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/static/styles.css
git commit -m "style(server): base + CV stylesheet with print rules"
```

---

## Task 24: Routes — preview

**Files:**
- Create: `packages/server/src/routes/preview.tsx`

- [ ] **Step 1: Create `packages/server/src/routes/preview.tsx`**

```tsx
import { Hono } from 'hono';
import { Layout } from '../render/Layout.js';
import { CV } from '../render/CV.js';
import { ErrorBanner } from '../render/ErrorBanner.js';
import { getActiveSource, sourceAvailability } from '../sources.js';
import { loadSource } from '../parse/index.js';

export const previewRoutes = new Hono();

previewRoutes.get('/preview', async (c) => {
  const source = await getActiveSource();
  if (!source) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">No active source. Pick one in the shell.</div>
      </Layout>,
    );
  }
  if (sourceAvailability(source) !== 'ok') {
    return c.html(
      <Layout title="Preview" sseClient>
        <ErrorBanner errors={[{ file: source.path, message: `source unavailable (${sourceAvailability(source)})` }]} />
      </Layout>,
    );
  }

  const result = await loadSource(source.path);
  if (!result.ok) {
    return c.html(
      <Layout title="Preview" sseClient>
        <ErrorBanner errors={result.errors} />
      </Layout>,
    );
  }

  return c.html(
    <Layout title={`${result.cv.profile.name} — CV`} sseClient>
      {result.warnings.length > 0 ? <ErrorBanner errors={result.warnings} /> : null}
      <CV cv={result.cv} />
    </Layout>,
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/preview.tsx
git commit -m "feat(server): GET /preview route"
```

---

## Task 25: Routes — shell

**Files:**
- Create: `packages/server/src/routes/shell.tsx`

- [ ] **Step 1: Create `packages/server/src/routes/shell.tsx`**

```tsx
import { Hono } from 'hono';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import { loadConfig } from '../config.js';
import { sourceAvailability } from '../sources.js';

export const shellRoutes = new Hono();

shellRoutes.get('/', async (c) => {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  return c.html(
    <Layout title="Curricularium">
      <Shell sources={config.sources} activeSourceId={config.activeSourceId} availability={availability} />
    </Layout>,
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/shell.tsx
git commit -m "feat(server): GET / shell route"
```

---

## Task 26: Routes — sources CRUD

**Files:**
- Create: `packages/server/src/routes/sources.tsx`

- [ ] **Step 1: Create `packages/server/src/routes/sources.tsx`**

```tsx
import { Hono } from 'hono';
import { Layout } from '../render/Layout.js';
import { Shell } from '../render/Shell.js';
import {
  activateSource,
  addSource,
  removeSource,
  sourceAvailability,
} from '../sources.js';
import { loadConfig } from '../config.js';

export const sourceRoutes = new Hono();

async function renderShell(c: Parameters<Parameters<typeof sourceRoutes.get>[1]>[0], errorMessage?: string) {
  const config = await loadConfig();
  const availability: Record<string, 'ok' | 'missing' | 'unreadable'> = {};
  for (const s of config.sources) availability[s.id] = sourceAvailability(s);

  return c.html(
    <Layout title="Curricularium">
      <Shell sources={config.sources} activeSourceId={config.activeSourceId} availability={availability} />
      {errorMessage ? <div class="add-source-error">{errorMessage}</div> : null}
    </Layout>,
  );
}

sourceRoutes.post('/sources', async (c) => {
  const form = await c.req.parseBody();
  const name = String(form['name'] ?? '');
  const path = String(form['path'] ?? '');
  const result = await addSource({ name, path });
  if (!result.ok) return renderShell(c, result.message);
  return renderShell(c);
});

sourceRoutes.delete('/sources/:id', async (c) => {
  await removeSource(c.req.param('id'));
  return renderShell(c);
});

sourceRoutes.post('/sources/:id/activate', async (c) => {
  await activateSource(c.req.param('id'));
  return renderShell(c);
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/sources.tsx
git commit -m "feat(server): sources CRUD routes"
```

---

## Task 27: Routes — asset & SSE

**Files:**
- Create: `packages/server/src/routes/asset.ts`
- Create: `packages/server/src/routes/events.ts`

- [ ] **Step 1: Create `packages/server/src/routes/asset.ts`**

```ts
import { Hono } from 'hono';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { getActiveSource } from '../sources.js';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export const assetRoutes = new Hono();

assetRoutes.get('/source-asset/*', async (c) => {
  const source = await getActiveSource();
  if (!source) return c.notFound();

  const requested = c.req.path.replace(/^\/source-asset\//, '');
  const decoded = decodeURIComponent(requested);
  const absolute = resolve(source.path, decoded);
  const rel = relative(source.path, absolute);
  if (rel.startsWith('..') || rel === '' || rel.split('/').includes('..')) {
    return c.text('Forbidden', 403);
  }

  try {
    const stats = await stat(absolute);
    if (!stats.isFile()) return c.notFound();
  } catch {
    return c.notFound();
  }

  const ext = absolute.slice(absolute.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const buf = await readFile(absolute);
  return c.body(buf, 200, { 'Content-Type': mime });
});
```

- [ ] **Step 2: Create `packages/server/src/routes/events.ts`**

```ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { addClient } from '../sse.js';

export const eventRoutes = new Hono();

eventRoutes.get('/events', (c) => {
  return streamSSE(c, async (s) => {
    const detach = addClient({
      send: (e) =>
        s.writeSSE({ event: e.event, data: JSON.stringify(e.data ?? {}) }),
    });

    const interval = setInterval(
      () => void s.writeSSE({ event: 'ping', data: '' }),
      25_000,
    );

    s.onAbort(() => {
      clearInterval(interval);
      detach();
    });

    await new Promise<void>(() => {});
  });
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routes/asset.ts packages/server/src/routes/events.ts
git commit -m "feat(server): source-asset and SSE events routes"
```

---

## Task 28: Mount routes + app entry

**Files:**
- Create: `packages/server/src/routes/index.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Create `packages/server/src/routes/index.ts`**

```ts
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { shellRoutes } from './shell.js';
import { sourceRoutes } from './sources.js';
import { previewRoutes } from './preview.js';
import { assetRoutes } from './asset.js';
import { eventRoutes } from './events.js';

export function buildApp(): Hono {
  const app = new Hono();
  app.use('/static/*', serveStatic({ root: './src' }));
  app.route('/', shellRoutes);
  app.route('/', previewRoutes);
  app.route('/', sourceRoutes);
  app.route('/', assetRoutes);
  app.route('/', eventRoutes);
  return app;
}
```

- [ ] **Step 2: Replace `packages/server/src/index.ts`**

```ts
import { serve } from '@hono/node-server';
import { buildApp } from './routes/index.js';
import { getActiveSource } from './sources.js';
import { startWatching, stopWatching } from './watcher.js';

const port = Number(process.env.PORT ?? 3000);

async function reattachWatcher(): Promise<void> {
  const active = await getActiveSource();
  if (!active) {
    stopWatching();
    return;
  }
  startWatching(active.path);
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

- [ ] **Step 3: Typecheck**

Run: `pnpm -F @curricularium/server typecheck`
Expected: pass.

- [ ] **Step 4: Smoke probe — server boots**

Run: `pnpm dev` (from repo root). After ~2s the console should print
`curricularium listening on http://localhost:3000`. Hit `Ctrl+C` to stop.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/index.ts packages/server/src/index.ts
git commit -m "feat(server): mount routes and wire app entry with watcher reattach"
```

---

## Task 29: README with run + smoke instructions

**Files:**
- Create: `packages/server/README.md`

- [ ] **Step 1: Create `packages/server/README.md`**

```markdown
# @curricularium/server

Local-only web app that renders a directory of markdown files (with frontmatter) into a LinkedIn-spiritual HTML CV. PDF export goes through the browser's print dialog.

## Run

```bash
pnpm install
pnpm vendor:htmx        # one-shot; copies node_modules/htmx.org/dist/htmx.min.js into src/static
pnpm dev                # starts the server on http://localhost:3000 (override with PORT)
```

Open <http://localhost:3000>. Add a source directory in the left aside. The first source becomes active automatically.

## Source directory shape

```
<source>/
├── profile.md           # required: frontmatter with name, headline, optional photo + contact
├── about.md             # optional: markdown body
├── experience/          # optional: one .md per role, frontmatter + bullet body
├── education/           # optional: one .md per entry
└── skills.md            # optional: groups[] or items[] in frontmatter
```

The schema is provisional and will track the parallel design session.

## Live reload

The active source is watched with chokidar. File changes broadcast a `reload` event over SSE (`/events`) and the preview iframe reloads. Debounced 150ms.

## PDF

Click **Print / Save PDF** in the header. The shell calls `iframe.contentWindow.print()`. Use Chromium-based browsers for best fidelity; "Save as PDF" lives in the print dialog.

Or open `/preview` in its own tab and print there.

## Trust boundary (v1)

This is a local-only, single-user tool bound to localhost. Markdown source files are owned by the user running the server. Body markdown is rendered to HTML and injected without sanitization, because the source is trusted local content.

If scope ever changes (multi-user, hosting, importing third-party markdown), an HTML sanitizer (e.g., DOMPurify) must be added to the parse pipeline before that change ships.

## Manual smoke test

A fixture lives in `fixtures/sample-cv/`. Add its absolute path as a source from the shell, then:

1. Confirm the preview renders with sidebar (photo placeholder, name, headline, chips) and main column (about, two experience entries in date-desc order, one education entry).
2. Edit `fixtures/sample-cv/about.md`, save, and confirm the preview reloads within ~200ms.
3. Click **Print / Save PDF** and verify the print dialog shows the CV (sidebar still dark).
4. Break `fixtures/sample-cv/profile.md` (remove the `name` field, save) and confirm an inline error banner appears in the preview.
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/README.md
git commit -m "docs(server): README with run, schema, and trust-boundary notes"
```

---

## Task 30: End-to-end manual smoke test

This is not a code task — it is the acceptance gate before declaring v1 done. Run through it once.

- [ ] **Step 1: Clean boot**

Run: `pnpm install && pnpm vendor:htmx && pnpm dev`
Expected: `curricularium listening on http://localhost:3000`.

- [ ] **Step 2: Add the fixture source**

In a browser, open <http://localhost:3000>. Fill the "Add source" form with name `Sample` and the absolute path to `packages/server/fixtures/sample-cv`. Submit.

Expected: the source row appears, status dot green, source row marked active, preview iframe populated.

- [ ] **Step 3: Verify CV layout**

In the preview iframe, confirm:
- Dark sidebar on the left with the photo placeholder, `Jane Doe`, headline, location, contact list, and the two skill groups as chips.
- Main column with About paragraph, Experience (Acme first, Globex below), Education (MIT).

- [ ] **Step 4: Verify live reload**

In a terminal: `echo "Updated bio." >> packages/server/fixtures/sample-cv/about.md`
Expected: the preview iframe reloads within ~200ms and the new sentence appears in About.

Revert: `git checkout -- packages/server/fixtures/sample-cv/about.md`

- [ ] **Step 5: Verify error banner**

Edit `packages/server/fixtures/sample-cv/profile.md` and remove the `name:` line. Save.
Expected: an error banner appears in the preview listing the missing field.
Revert: `git checkout -- packages/server/fixtures/sample-cv/profile.md`.

- [ ] **Step 6: Verify print**

Click **Print / Save PDF** in the header. The browser print dialog opens against the preview iframe. Pick "Save as PDF" and confirm the resulting PDF preserves the dark sidebar and lays out on A4 without sections splitting awkwardly.

- [ ] **Step 7: Final commit (only if any docs/fixtures were updated during smoke testing)**

```bash
git status
# only if there are tracked changes:
git add -A
git commit -m "chore: smoke-test pass"
```

Stop the server (`Ctrl+C`). v1 is complete.

---

## Self-review notes

- Spec §2: in-scope items (monorepo, Node, Hono, hono/jsx, multi-source, sidebar+main, SSE reload, browser-print PDF) all map to tasks 1, 2, 22, 17–21, 13–14, 15–16, 23 respectively. Out-of-scope items (auth, server-side PDF, in-browser editor, additional templates, extra sections, i18n, automated tests) are absent from the plan — correct.
- Spec §3.1 file layout matches Task 1+2 scaffolding and the file plan above.
- Spec §3.2 tech stack matches Task 2 dependencies.
- Spec §3.3 eager-parse pipeline implemented end-to-end in Tasks 5–11; called from `/preview` (Task 24).
- Spec §4 model: Task 4 covers all fields, with the same shape (`profile.contact.*`, `experience[].bullets`, `skills[].group/items`).
- Spec §5 source-dir convention reflected in Tasks 6–11 and fixture Task 12.
- Spec §6 config: XDG path, schema, first-run auto-activate, validation requiring `profile.md`, reattach for missing paths — Tasks 13, 14, 25.
- Spec §7 API surface: every route in the table has a task (shell §25, sources §26, preview §24, source-asset §27, events §27, static via Task 28 `serveStatic`).
- Spec §8.1 layout (CSS Grid two-column, ~280px sidebar) — implemented in Task 23 styles.
- Spec §8.2 trust boundary: `dangerouslySetInnerHTML` used without sanitizer, called out in README (Task 29) and in code in Tasks 19, 20, 21.
- Spec §8.3 asset path-traversal guard: Task 27 `relative(...).startsWith('..')` check.
- Spec §9 SSE + chokidar + 150ms debounce + reload-only payload: Tasks 15, 16, 27.
- Spec §10 print: `@page A4`, `@media print`, color preservation, `break-inside: avoid` — Task 23. Print button in shell (Task 22) calls `iframe.contentWindow.print()`.
- Spec §11 error table: each row addressed — startup/runtime missing source via `sourceAvailability` (Task 14 + render in shell), add-source invalid via inline error (Task 26), parse error banner via `ErrorBanner` (Tasks 21, 24).
- Spec §12 testing deferred: no automated tests in plan; manual smoke checklist at Task 30 covers all checkpoints from §12.
- Placeholder scan: no TBDs, no "implement later", code blocks present in every implementation step.
- Type consistency: `CV`, `Profile`, `ExperienceEntry`, `EducationEntry`, `SkillsGroup`, `ParseError`, `ParseResult` defined in Task 4 and used unchanged thereafter. `Source` defined in Task 13, used in Task 14 and 22. `sourceAvailability` declared in Task 14 and used in Tasks 22, 24, 25.
