# Curricularium Rendering Engine — Design Spec

- **Date:** 2026-05-29
- **Status:** Draft, awaiting user review
- **Scope:** Spec-driven rendering engine on top of `publish/` variant folders, replacing the v1 ad-hoc parser/model.
- **Related contract:** `~/cv/publish/SPEC.md` (the authoritative spec for the input directory shape).
- **Supersedes (in part):** `docs/superpowers/specs/2026-05-28-curricularium-design.md` — the v1 ad-hoc parser, model, render, and source convention. v1 HTTP shell (Hono + HTMX + SSE + chokidar + config) is reused.

## 1. Goal

Build a spec-driven rendering engine that:

- Reads a `publish/` directory shaped by SPEC.md (variants as immediate subfolders, each holding atom files with frontmatter).
- Loads a chosen variant into a typed `SpecCV` model.
- Renders that model to any of three outputs: **HTML** (existing LinkedIn-spiritual look, reshaped), **JSON Resume**, and **Europass XML**.
- Exposes a theme axis per output (HTML in-house theme; JSON Resume `raw` + bundled community themes; Europass canonical).
- Drives the existing web shell (variant + output + theme pickers, live preview, Generate to a configurable output folder).

The v1 placeholder schema and ad-hoc parser are replaced. Output is the primary artifact (file on disk) and a live preview (iframe).

## 2. Non-goals

- Reading `master-v02/`. The tool MUST NOT read `master-v02/` (SPEC.md §2). The engine consumes `publish/` only.
- Server-side PDF rendering. PDF stays browser-print of the HTML output.
- Multi-user, hosting, auth.
- In-browser editing.
- ATS-rule enforcement beyond what's reachable from the model (we can't check typeface; we control the CSS).
- Europass XSD validation.
- JSON Schema emission from Zod (SPEC.md §13.5 is deferred).
- macOS / Windows support. Linux assumptions: `xdg-open`, `~/.config/curricularium`.
- Multi-variant batch render. One **Generate** per `(variant, output, theme)` triple.
- `master-v02` ingestion / derivation tooling.

## 3. Architecture

A new `@curricularium/core` package owns the engine. `@curricularium/server` becomes a thin HTTP shell over it.

```
packages/
├── core/                                @curricularium/core (new)
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                     public API: discoverVariants, loadVariant, render
│   │   ├── spec/
│   │   │   ├── model.ts                 SpecCV types
│   │   │   ├── schemas.ts               Zod schemas per atom type + variant.md
│   │   │   ├── canonical.ts             SPEC.md §7.4 heading taxonomy, default section-order, date renderers
│   │   │   └── banned-strings.json      seed list for the §7 lint
│   │   ├── loader/
│   │   │   ├── discover.ts              variant discovery from publish/ root
│   │   │   ├── atoms.ts                 atom file → { frontmatter, body } via gray-matter
│   │   │   ├── validate.ts              schema validation → warnings list
│   │   │   └── assemble.ts              atoms → SpecCV (sort, group, visibility filter, comment strip)
│   │   ├── outputs/
│   │   │   ├── registry.ts              OutputDef / ThemeDef, registry helpers
│   │   │   ├── html/
│   │   │   │   ├── adapter.ts           delegates to selected theme
│   │   │   │   └── themes/
│   │   │   │       └── linkedin-spiritual/        (existing JSX, reshaped to SpecCV)
│   │   │   ├── jsonresume/
│   │   │   │   ├── adapter.ts           SpecCV → JsonResume object helper (reused by community themes)
│   │   │   │   └── themes/
│   │   │   │       ├── raw/                       emits resume.json
│   │   │   │       └── community/                 wraps jsonresume-theme-* packages
│   │   │   └── europass/
│   │   │       ├── adapter.ts           SpecCV → Europass XML structure helper
│   │   │       └── themes/
│   │   │           └── canonical/                 emits Europass XML
│   │   └── render.ts                    one entry: render({ cv, outputId, themeId, opts })
│   └── tsconfig.json
└── server/                              @curricularium/server (rewired)
    ├── src/
    │   ├── index.ts                     (kept)
    │   ├── config.ts                    extended: outputDir, autoWrite per output, activeVariant/output/theme
    │   ├── sources.ts                   (kept)
    │   ├── sse.ts                       (kept)
    │   ├── watcher.ts                   scope = active variant root; reattach on variant change
    │   ├── render/
    │   │   ├── Shell.tsx                extended with variant + output + theme pickers, Generate button
    │   │   ├── Layout.tsx               (kept)
    │   │   └── WarningsBanner.tsx       renamed from ErrorBanner; covers banner + counter
    │   ├── routes/
    │   │   ├── index.ts                 (kept)
    │   │   ├── shell.tsx                extended
    │   │   ├── sources.tsx              (kept)
    │   │   ├── preview.tsx              /preview?variant=&output=&theme=
    │   │   ├── generate.tsx             POST /generate; writes to outputDir, returns artifact + warnings
    │   │   ├── open-output.tsx          GET /open-output?file=…; xdg-open shim
    │   │   ├── asset.ts                 resolves under active variant root
    │   │   └── events.ts                (kept)
    │   └── static/                      (kept)
    └── README.md                        rewritten
```

**One package boundary, not two.** Core is pure (fs read only). A future CLI is `import { loadVariant, render } from '@curricularium/core'` plus a Commander shell — no engine refactor.

**v1 deletions / moves.**

- Delete: `packages/server/src/model.ts`, `packages/server/src/parse/{about,education,experience,markdown,profile,skills,index}.ts`.
- Move + reshape: `packages/server/src/render/{CV,Sidebar,Main,ExperienceItem,EducationItem}.tsx` → `packages/core/src/outputs/html/themes/linkedin-spiritual/`. The JSX consumes `SpecCV`.
- Keep: `packages/server/src/render/{Layout,Shell,ErrorBanner→WarningsBanner}.tsx`.
- Replace: `packages/server/fixtures/sample-cv/` → a SPEC-compliant `publish/` fixture with two minimal variants.

### Tech choices

| Concern         | Choice                                                          |
|-----------------|-----------------------------------------------------------------|
| Runtime         | Node.js (via `@hono/node-server`)                               |
| Language        | TypeScript, strict mode                                         |
| Web framework   | Hono                                                            |
| Templating      | `hono/jsx` (server-rendered JSX, no client framework)           |
| UI interactivity| HTMX                                                            |
| Markdown        | `gray-matter` (frontmatter) + `marked` (body, at output time)   |
| Validation      | `zod`                                                           |
| File watching   | `chokidar`                                                      |
| Styling         | Hand-written CSS, served as static file                         |
| Engine tests    | `vitest` (core package only)                                    |
| JSON Resume themes | `jsonresume-theme-elegant`, `-kendall`, `-flat`, `-stackoverflow` |
| Europass XML    | Hand-written XML builder (no XML lib)                           |
| PDF             | Browser print + `@media print` CSS (HTML output only)           |

## 4. Data model

`@curricularium/core/src/spec/model.ts`. Mirrors SPEC.md §3–§5; non-public atoms never enter the model.

```ts
type YearMonth = `${number}-${number}`;        // "YYYY-MM"
type Year = `${number}`;                       // "YYYY"
type DateLike = YearMonth | Year | "present";  // lowercase 'present'

type LangCode = string;                        // ISO 639-1
type LocationStr = string;                     // "City, Country"
type SectionType =
  | "personal" | "identity" | "work-experience" | "project"
  | "skill" | "education" | "community" | "open-source"
  | "award" | "publication" | "language";

type Profile = { network: string; url: string; username: string | null };

type AtomBase = {
  name: string;
  source: string | null;
  order: number;
  lang: LangCode;
  variantRationale?: string;
};

type WorkExperience = AtomBase & {
  type: "work-experience";
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

type Project = AtomBase & {
  type: "project";
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

type Education = AtomBase & {
  type: "education";
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

type Community = AtomBase & {
  type: "community";
  organisation: string;
  role: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  location: LocationStr | null;
  url: string | null;
  body: string;
};

type OpenSource = AtomBase & {
  type: "open-source";
  title: string;
  repoUrl: string;
  role: "author" | "maintainer" | "contributor";
  periodStart: DateLike;
  periodEnd: DateLike;
  tech: string[];
  keywords: string[];
  body: string;
};

type Award = AtomBase & {
  type: "award";
  title: string;
  awarder: string;
  date: DateLike;
  url: string | null;
  body: string;
};

type Publication = AtomBase & {
  type: "publication";
  title: string;
  publisher: string;
  date: DateLike;
  url: string | null;
  authors: string[];
  body: string;
};

type SkillGroup = {
  name: string;
  items: string[];
  level: string | null;
  europassBucket?: "JobRelated" | "Digital" | "Communication" | "Organisational";
};
type Skills = AtomBase & {
  type: "skill";
  groups: SkillGroup[];
  body: string;
};

type Language = {
  code: LangCode;
  name: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "native";
  detail: string | null;
};
type Languages = AtomBase & {
  type: "language";
  languages: Language[];
  body: string;
};

type Personal = AtomBase & {
  type: "personal";
  fullName: string;
  targetRole: string;
  email: string;
  phone: string | null;
  location: LocationStr;
  profiles: Profile[];
  body: string;
};

type IdentityHeadline = AtomBase & { type: "identity"; subtype: "headline"; body: string };
type IdentityAbout    = AtomBase & { type: "identity"; subtype: "about";    body: string };

type VariantManifest = {
  type: "variant";
  name: string;
  title: string;
  targetRole: string;
  sectionOrder: SectionType[];     // SPEC.md §7.5 default applied when omitted
  lang: LangCode;
  sourceMaster: string;
  outputTargets: string[];         // informational; engine ignores
  summaryMode?: "summary" | "objective";   // §7.4 default 'summary'
  collapseOpenSource?: boolean;            // default false
  body: string;
};

type SpecCV = {
  variantRoot: string;             // absolute path to publish/<variant>/
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
```

**Bodies stay raw markdown.** The loader strips HTML comments (SPEC.md §6.1). Each output transforms markdown differently (HTML runs `marked`; JSON Resume splits per the convention below; Europass strips to plaintext).

**Dates stay normalized.** Stored as `YYYY-MM | YYYY | "present"`. Format applied at output time per `canonical.ts`.

**Visibility filtering.** Atoms with `visibility !== "public"` never enter the model.

**Identity.** `identity.about` occupies the `identity` slot in `sectionOrder`. `identity.headline` is rendered above the personal block (SPEC.md §5), not addressable via `sectionOrder`.

## 5. Engine pipeline

`@curricularium/core/src/index.ts` exposes three functions; everything else is internal.

```ts
export function discoverVariants(publishRoot: string): Promise<VariantSummary[]>;
export function loadVariant(variantRoot: string): Promise<LoadResult>;
export function render(args: {
  cv: SpecCV;
  outputId: string;
  themeId: string;
  opts?: unknown;
}): Promise<RenderResult>;
```

```ts
type VariantSummary = { name: string; title: string; path: string };
type LoadWarning = { file: string; field?: string; message: string; category: WarningCategory };
type LoadResult =
  | { ok: true; cv: SpecCV; warnings: LoadWarning[] }
  | { ok: false; errors: LoadWarning[] };       // only for variant.md missing/unparseable
type RenderResult = {
  contentType: string;       // "text/html" | "application/json" | "application/xml"
  filename: string;          // suggested filename
  bytes: Uint8Array;
  warnings: LoadWarning[];   // load warnings + theme warnings
};
```

### Load pipeline

1. Parse `variant.md`. Missing or unparseable → `ok: false`. Default `sectionOrder` per SPEC.md §7.5 when absent.
2. Glob `**/*.md` under the variant root (skip dotfiles, skip `variant.md`).
3. Per atom file:
   - `gray-matter` → `{ frontmatter, body }`.
   - Validate frontmatter against the per-`type:` Zod schema. Errors collected as warnings; atom kept if minimally usable (`name` + `type` present); fully unusable atoms skipped with a warning.
   - Visibility filter: atom dropped if `visibility !== "public"` (logged as `visibility` warning).
   - Body sanitize: strip HTML comments.
   - Key normalization: kebab → camelCase; `present` lowercased; dates stay as strings.
4. Partition by `type:`. Folder is ignored. Single-entity types (`skill`, `language`, `personal`) accept flat file or folder; multiple files of these types → first kept, others warned (`multi-singleton`).
5. Pair `identity` atoms by `subtype:`. Missing pieces are warnings, not failures.
6. Sort each section (sort key, then `order` asc as tiebreaker):
   - `workExperience`, `education`, `community`, `openSource`: `periodStart` desc.
   - `projects`: grouped by `parentExperience` first, then `periodStart` desc.
   - `awards`, `publications`: `date` desc.
7. Cross-atom warnings (never block):
   - Action-verb lead miss on body bullets.
   - Acronym used without full term on first occurrence.
   - `periodEnd < periodStart`.
   - `present` on a non-most-recent `workExperience`.
   - Banned-string match.
   - `refProjects` / `parentExperience` slug missing.
8. Return `{ ok: true, cv, warnings }`.

### Render pipeline

1. Resolve output adapter from registry by `outputId`. Unknown id → throw `UnknownOutput`.
2. Resolve theme by `themeId`. Unknown id → throw `UnknownTheme`.
3. `theme.render(cv, opts)` → `{ contentType, filename, bytes, warnings }`.
4. Concatenate theme warnings with load warnings. Server bundle hands them to the WarningsBanner.

## 6. Output registry, adapters, themes

### Registry shape

```ts
type OutputDef = {
  id: string;
  label: string;
  themes: ThemeDef[];
  defaultThemeId: string;
};
type ThemeDef = {
  id: string;
  label: string;
  contentType: string;
  filenameExt: string;
  render: (cv: SpecCV, opts: unknown) => Promise<{
    bytes: Uint8Array;
    warnings: LoadWarning[];
  }>;
};
```

Filename suggestion: `<variantName>-<outputId>[-<themeId>]<filenameExt>`. Theme suffix dropped when the output has only one theme.

### Output `html`

- `linkedin-spiritual` (default). Existing JSX reshaped to consume `SpecCV`. Section heading taxonomy per SPEC.md §7.4; section order from `cv.variant.sectionOrder`; date renderer applies §7.7 (MM/YYYY). Bodies pass through `marked`. Print CSS retained: `@page A4`, `.no-print`, `break-inside: avoid`, `print-color-adjust: exact`.

### Output `jsonresume`

- `raw` (default). Emits JSON Resume v1.0.0 `resume.json`. Mapping per SPEC.md §8.1:
  - `personal` → `basics` (`name`, `email`, `phone`, `location.{city,countryCode|region}`, `profiles[]`).
  - `identity.headline.body` → `basics.label`.
  - `identity.about.body` → `basics.summary`.
  - `workExperience[]` → `work[]` (`name`, `position`, `location`, `url`, `startDate` (`YYYY-MM-01`), `endDate` or omitted for `present`, `summary`, `highlights[]`).
  - `projects[]` → `projects[]`.
  - `education[]` → `education[]`.
  - `skills` groups → `skills[]` (`name`, `level`, `keywords: items`).
  - `languages.languages[]` → `languages[]` (`language`, `fluency`).
  - `community[]` → `volunteer[]`.
  - `openSource[]` → `projects[]` by default; when `cv.variant.collapseOpenSource === false`, additionally emitted as a custom `openSource[]` extension array (harmless to standard consumers).
  - `awards[]` → `awards[]`.
  - `publications[]` → `publications[]`.

  Body → `summary` / `highlights[]` convention (resolves SPEC.md §13.4):
  - Leading `>` blockquote line becomes the first sentence of `summary`.
  - Consecutive non-`-` non-empty lines from the top are joined into `summary` (blockquote prepended).
  - Lines starting with `- ` (after optional whitespace) become `highlights[]` entries.
  - Mixed paragraphs after bullets are appended to `summary` with a blank-line separator.

- Community themes: `elegant`, `kendall`, `flat`, `stackoverflow`. Each imports its npm package and calls `render(resume)`. Output: HTML; `contentType: text/html`; `filenameExt: .html`. Themes consume the resume object produced by the `raw` adapter helper (adapter helper is shared internally; the engine's public API still routes through `render()`).

### Output `europass`

- `canonical` (default, only theme). Emits Europass-CV-v3.4 XML. Mapping per SPEC.md §8.2:
  - `personal` → `Identification` (`PersonName`, `ContactInfo`, `Address`, `Email`, `Telephone`).
  - `identity.headline.body` → `Headline.Description`.
  - `identity.about.body` → `PersonalDescription`.
  - `workExperience[]` → `WorkExperience[]`.
  - `projects[]` → nested under matching parent's `Project[]` when `parentExperience` set; standalone `WorkExperience` otherwise (`Position.Label = project.title`).
  - `education[]` → `Education[]`.
  - `skills.groups` → `Skills` buckets. Bucket resolution (resolves SPEC.md §13.3): (1) `group.europassBucket` if set, else (2) lowercase substring match on `group.name` for `digital`, `communication`, `organisational`, else (3) `JobRelated`.
  - `languages.languages[]` → `Skills.Linguistic` (native → `MotherTongue`; else `ForeignLanguage` with CEFR mapping).
  - `community[]` → `WorkExperience` with `<Volunteer>true</Volunteer>`.
  - `openSource[]` → `WorkExperience` with volunteer flag.
  - `awards[]` → `Honour[]`.
  - `publications[]` → `Publication[]`.
  - Dates: `YYYY` → `<Year>YYYY</Year>`; `YYYY-MM` → `<Year>YYYY</Year><Month>--MM</Month>`; `present` → `<Current>true</Current>`.

XML emitted via a small hand-written builder. XSD validation is the user's responsibility (README note).

## 7. UX, picker, Generate, output folder

### Shell

Left aside has two blocks when a source is active:

- Sources (existing list + add-source).
- Variant + Output + Theme pickers, Generate button, Open-file action, output folder path with "change" link, warnings counter.

Selection state lives in URL query (`?variant=&output=&theme=`) and in the active config.

### Preview pane (`/preview`)

Always live. Re-renders on SSE reload. Behavior per `contentType`:

- `text/html` → iframe shows it.
- `application/json` → server-rendered syntax-highlighted `<pre>`.
- `application/xml` → same as JSON.

### Generate

On click for the current `(variant, output, theme)`:

1. `loadVariant(activeVariantRoot)` → `cv`.
2. `render({ cv, outputId, themeId })` → bytes.
3. Write to `<outputDir>/<variantName>-<outputId>[-<themeId>]<ext>` (overwrite).
4. HTMX fragment updates the button area: "✓ wrote `<path>`" plus an `⤓ Open file` HTMX action that POSTs `/open-output?file=<absolute-path>`.

No artifact list, no versioning. User owns `outputDir`.

### Per-output `autoWriteOnRender`

| Output       | Default | Rationale                                                |
|--------------|---------|----------------------------------------------------------|
| `html`       | `true`  | Live preview; disk file tracks source idempotently.     |
| `jsonresume` | `false` | Commit-style artifact; explicit Generate.               |
| `europass`   | `false` | Same.                                                    |

Per-output flag overridable in config (`autoWrite: { html: true, ... }`). No UI toggle in v1.

When `autoWriteOnRender: true`, every server-side re-render also writes to `outputDir`. Concurrent writes guarded by per-file async lock (latest-render-wins).

### Output folder configuration

Extended `config.json`:

```json
{
  "sources": [
    {
      "id": "ulid",
      "name": "Personal CV",
      "path": "~/cv/publish",
      "outputDir": "~/cv/_out",
      "autoWrite": { "html": true, "jsonresume": false, "europass": false },
      "addedAt": "2026-05-29T10:00:00Z"
    }
  ],
  "activeSourceId": "ulid",
  "activeVariantName": "founder-cto",
  "activeOutputId": "html",
  "activeThemeId": "linkedin-spiritual"
}
```

`outputDir` defaults to `<sourcePath>/../_out` when unset; "change" UI lets the user pick. Created lazily on first Generate. Per-source (different CV projects, different folders).

### `Open file` shim

`POST /open-output?file=<absolute-path>` validates the path lives under the source's `outputDir` (path-traversal guard), spawns `xdg-open <file>`, replies `204`. Linux only.

## 8. Live reload (SSE) with multi-output

### Watcher

- One chokidar watcher, scope = `<sourcePath>/<activeVariantName>/`. Glob: `**/*.md`, `**/*.{png,jpg,jpeg,webp,svg}`. Debounce 150ms. Dotfiles excluded.
- Reattach on source change, variant change, or source path becoming valid again.
- Non-active variants unwatched. Switching variants reattaches and reloads.
- Existing path-cache + error-handler reused.

### SSE events

```
event: reload
data: { "variant": "founder-cto", "output": "html", "theme": "linkedin-spiritual" }
```

Preview client (in `Layout.tsx`) compares against its query and `location.reload()` on match.

```
event: warnings
data: { "count": 3, "html": "<…rendered banner partial…>" }
```

Preview swaps the banner div via HTMX OOB (`hx-swap-oob`).

### Per-tick work

1. `loadVariant(activeVariantRoot)`.
2. Re-render currently-shown `(output, theme)`.
3. For every output with `autoWriteOnRender: true`, re-render and write to `outputDir`. v1: just `html`.
4. Broadcast `reload`; if warnings changed, broadcast `warnings`.

Auto-write set rendered in parallel (`Promise.all`); failures isolated.

### Connection bookkeeping

Existing `sse.ts` Set/`close` cleanup unchanged. Active-source/variant changes don't close clients.

### Parse-failure surface

`ok: false` from `loadVariant` blanks the preview to a single-banner page. Subsequent edits trigger re-attempts.

## 9. Validation, warnings, errors

### Two outcomes

Per Q7 = best-effort:

- **Load-failed (`ok: false`).** `variant.md` missing/unparseable. Preview is banner-only. No output produced. `autoWriteOnRender` skipped.
- **Load-with-warnings (`ok: true`).** Everything else. CV assembled from salvageable atoms. Render proceeds. Warnings surface in banner.

Privacy hits, missing required frontmatter, banned-string matches, action-verb misses — all warnings. Engine does not enforce SPEC.md's MUSTs; the author is the gatekeeper. README states this.

### Warning categories

| Category            | Source                                        | Example                                                                |
|---------------------|-----------------------------------------------|------------------------------------------------------------------------|
| `schema`            | Zod parse against per-`type:` schema          | `experience/030-yeself.md: position is required`                       |
| `unknown-field`     | Frontmatter keys outside the schema           | `projects/100-acme.md: unknown field "team"`                           |
| `visibility`        | Atom dropped due to non-public visibility     | `experience/020-applearn.md: skipped (visibility=nda)`                 |
| `date`              | `periodEnd < periodStart`, `present` misuse   | `experience/050-data-system-soft.md: period-end before period-start`   |
| `body-h1`           | Body contains `# ` heading                    | `about.md: body contains level-1 heading (forbidden by §6.2)`          |
| `action-verb`       | Bullet doesn't lead with action verb          | `experience/010-nexthink.md: bullet 3 starts with "Was responsible"`   |
| `acronym`           | Acronym before full term                      | `experience/010-nexthink.md: "DAP" appears before full term`           |
| `banned-string`     | Banned-strings list hit                       | `experience/010-nexthink.md: matches "salary" pattern`                 |
| `cross-atom`        | refProjects/parentExperience slug missing     | `experience/010-nexthink.md: ref-projects[0]="ai-amplify" not found`   |
| `identity-missing`  | identity in section-order but atom absent     | `identity/about.md not found; Professional Summary will be empty`      |
| `multi-singleton`   | Multiple files of a single-entity type        | `skills/leadership.md: ignored, skills.md already loaded`              |
| `render-mapping`    | Output adapter / theme couldn't map a field   | `europass: language "Slovak" → no CEFR level; treated as native`       |

### Banned-strings list

`packages/core/src/spec/banned-strings.json` seeds with `salary`, `ARR`, `revenue`, `EBITDA`, `headcount` (case-insensitive, word-bounded). User extends via per-source config (`bannedStrings: [...]`) — additive. Master-v02 codename flagging is unreachable (engine doesn't read master-v02); README notes this.

### Banner UX

`WarningsBanner.tsx` (renamed from `ErrorBanner.tsx`) renders in two places:

- Top of `/preview` (collapsed summary; click to expand).
- Below the picker in the shell aside (always-visible counter).

Both update via the SSE `warnings` event.

### Render-time failures

If `theme.render()` throws, engine catches, returns empty bytes with one `render-mapping` warning, preview shows banner-only frame. User can switch theme without restarting.

## 10. SPEC.md interaction

No edits to `SPEC.md` in v1. Every divergence is recorded here so a future SPEC.md revision can absorb the proven defaults.

### Explicit divergences

1. **Validation policy.** SPEC.md §3, §9 use "MUST reject." Engine treats every validation hit as a non-blocking warning. Only `variant.md` missing/unparseable is fatal.
2. **§13.1 variant.md body surfacing.** Ignored by all three outputs in v1; future theme opt may surface as cover-summary.
3. **§13.2 open-source default.** Separate **Open Source** section; `variant.collapseOpenSource: true` folds into Projects.
4. **§13.3 Europass Skills bucket.** Explicit `europassBucket:` per skill group → name-substring detection → fallback `JobRelated`.
5. **§13.4 JSON Resume body convention.** Paragraph → `summary`; `- ` lines → `highlights[]`; leading `>` → first line of `summary`.
6. **§13.5 JSON Schemas under `_schema/`.** Out of scope for v1. Zod schemas in code are the source of truth.

### Operational decisions SPEC.md is silent on

- Default `outputDir`: `<sourcePath>/../_out`.
- Filename pattern: `<variantName>-<outputId>[-<themeId>]<ext>`, theme suffix dropped when one theme exists.
- `autoWriteOnRender` defaults: HTML true, others false.
- Banned-strings seed: `salary`, `ARR`, `revenue`, `EBITDA`, `headcount`.
- Linux-only `Open file` shim (`xdg-open`).

## 11. Testing

- **Engine (`@curricularium/core`): `vitest` against fixtures.**
  - Fixture variants under `packages/core/test/fixtures/publish/{founder-cto,vp-eng}/`, minimal but exercise every atom type.
  - `loader/`: per-atom Zod validation, visibility filtering, comment stripping, ordering, identity pairing, warning categories.
  - `outputs/jsonresume/raw`: golden `resume.json` per fixture variant.
  - `outputs/europass/canonical`: golden XML per fixture variant; dates + bucket resolution.
  - `outputs/html/linkedin-spiritual`: smoke — render returns non-empty bytes containing expected section headings.
  - Section ordering and `collapseOpenSource` toggles.
- **Server: manual smoke test.** Existing v1 smoke flow plus: switch variant, switch output to JSON Resume, Generate, confirm file lands in `outputDir`, confirm warnings banner reflects fixture-injected warnings, switch to a community JSON Resume theme, confirm preview.
- **No browser-driven tests.** Playwright/Cypress deferred.

`vitest` is a devDependency on `@curricularium/core` only. Root `package.json` gains `"test": "pnpm -F @curricularium/core test"`.

## 12. Out of scope (cross-cutting)

- macOS / Windows.
- Server-side PDF rendering. Browser print of HTML output is the PDF path.
- Authentication, multi-user, hosting.
- In-browser markdown editing.
- Theme `opts` UI surface (engine accepts opts; v1 themes ignore).
- Multi-variant batch render.
- Europass XSD validation.
- JSON Schema emission from Zod.
- `master-v02` ingestion / derivation tooling.
- ATS-rule enforcement beyond what's in the model.
- `variant.md` body as cover-summary.
- Per-output community themes for Europass.

## 13. Open items

- Concrete CEFR → Europass `ProficiencyLevel` mapping table (covered in code; lock here when implementation lands).
- Banned-strings policy on the JSON Resume `raw` theme (warnings only, or should the matching atom's body field be redacted before emission?). Default: warnings only.
- Whether the `linkedin-spiritual` theme should attempt to render the `Open Source` and `Publications` sections (only ever exercised once real atoms exist); v1 ships visible sections, refined in iteration.

## 14. Glossary

- **Atom** — one markdown file in a variant folder, representing one entity.
- **Variant** — one role-targeted CV folder under `publish/`.
- **Output** — a concrete format the engine emits (HTML, JSON Resume, Europass XML).
- **Theme** — a render strategy for an output (e.g., `linkedin-spiritual` for HTML, `elegant` for JSON Resume).
- **Output folder (`outputDir`)** — the configurable on-disk location where Generate writes artifacts.
- **autoWriteOnRender** — per-output flag controlling whether every re-render also writes to `outputDir`.
