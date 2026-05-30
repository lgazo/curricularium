---
type: spec
name: cv-publish-format-spec
version: 1.0.0
owner: Ladislav Gažo
purpose: contract between master source data, variant publish folders, and the render tool that emits ATS-compliant CV outputs (JSON Resume, Europass XML, Pandoc PDF, …)
status: draft
date: 2026-05-29
sources:
  - master/README.md
  - communication profile.md
  - https://www.kickresume.com/en/blog/ats-friendly-resume/
  - https://www.kickresume.com/en/blog/what-to-include-in-a-resume/
---

# CV Publish Format — Spec

This document is the contract for the `publish/` tree of `Curriculum/`.
It is both:

- a **machine-consumable** contract for the render tool (frontmatter shapes, ordering, validation rules, output mappings),
- a **human-readable** guideline for the author (claude or Ladislav) producing per-variant atom files from the `master/` canonical source.

The tool MUST NOT parse atom bodies. The tool is driven by frontmatter and by file granularity. Atom bodies are dropped verbatim into the rendered section.

## 1. Purpose & scope

- Bridge between `master/` (private analytical brain) and the public visual CV output.
- Support multiple **role-targeted variants** of the CV, each living in its own folder under `publish/`.
- Stay tool-agnostic: the frontmatter is a superset rich enough to populate **JSON Resume**, **Europass XML**, **Pandoc-rendered PDF** (and similar) without re-authoring atoms per target.
- Stay **ATS-compliant** out of the box: standard section headings, reverse-chronological layout, ASCII-clean bodies, no graphics, no header/footer contact info, keyword discipline.

Out of scope:
- The render tool's internals.
- master schema (governed by `master/README.md`).
- Cover letters (separate concern).

## 2. Folder layout

```
Curriculum/
├── master/                       # canonical, edit here first
└── publish/                          # tool reads these
    ├── SPEC.md                       # this file
    ├── _schema/                      # JSON Schemas for atom frontmatter
    │   ├── atom.schema.json
    │   ├── work-experience.schema.json
    │   ├── project.schema.json
    │   ├── education.schema.json
    │   ├── community.schema.json
    │   ├── open-source.schema.json
    │   ├── award.schema.json
    │   ├── publication.schema.json
    │   ├── language.schema.json
    │   ├── skill.schema.json
    │   ├── personal.schema.json
    │   ├── identity.schema.json
    │   └── variant.schema.json
    ├── founder-cto/
    │   ├── variant.md
    │   ├── identity/
    │   │   ├── headline.md
    │   │   └── about.md
    │   ├── experience/
    │   │   ├── 010-nexthink.md
    │   │   ├── 020-applearn.md
    │   │   ├── 030-yeself.md
    │   │   ├── 040-seges.md
    │   │   └── 050-data-system-soft.md
    │   ├── projects/
    │   │   └── NNN-<slug>.md
    │   ├── community/
    │   ├── open-source/
    │   ├── education/
    │   ├── awards.md
    │   ├── publications.md
    │   ├── languages.md
    │   ├── skills.md
    │   └── personal.md
    ├── vp-eng/
    ├── architect/
    └── product-owner/
```

Rules:
- Folder names mirror `master/` entity buckets. The tool decides section assignment from frontmatter `type:`, not folder name. Folder names exist as human navigation aid only.
- Filename numeric prefix `NNN-` (zero-padded) is a human scan aid. The tool ignores prefix and uses frontmatter `order:`.
- Single-entity sections (`awards`, `publications`, `languages`, `skills`, `personal`) MAY stay as flat files at the variant root. Folder-form is also valid if multiple atoms exist.
- A variant folder is self-contained. The tool MUST NOT read across folders, MUST NOT read `master/`.

## 3. Frontmatter — shared base

Every atom file carries the base block:

```yaml
type: <work-experience|project|education|community|open-source|award|publication|skill|language|personal|identity|variant>
name: <kebab-slug>            # stable id, unique within variant folder
source: <master-slug>     # provenance, the master atom this derives from; null for variant-only atoms
order: <int>                  # within-type ordering hint; lower = earlier; tool default = reverse-chrono by period-start
lang: en                      # default en; sk allowed; ISO 639-1
visibility: public            # public|nda|private — tool MUST skip non-public
variant-rationale: <free>     # optional, why included in this variant; tool ignores
```

The tool MUST reject an atom missing any base field except `variant-rationale`.

## 4. Frontmatter — per-type fields

### 4.1 `work-experience`

```yaml
employer: <name>
position: <title held>
period-start: <YYYY-MM|YYYY>
period-end: <YYYY-MM|YYYY|present>
location: <City, Country>
url: <company url | null>
skills: [ ... ]               # top skills surfaced for this entry in THIS variant
keywords: [ ... ]             # ATS hints, role-targeted
ref-projects: [ <slugs> ]     # project atom slugs in the same variant folder
team-size: <int | null>       # informational; bodies generalise per §10 when reputational risk applies
report-line: <free | null>    # e.g. "VP Engineering then CTO"
```

### 4.2 `project`

```yaml
title: <project name>
client: <end client | null>
employer: <delivering company>
parent-experience: <work-experience slug | null>
period-start: <YYYY-MM|YYYY>
period-end: <YYYY-MM|YYYY|present|null>
location: <City, Country | null>
sector: <industry>
roles: [ ... ]
tech: [ ... ]
url: <project url | null>
keywords: [ ... ]
```

### 4.3 `education`

```yaml
institution: <name>
location: <City, Country>
degree: <title>
field: <field of study>
period-start: <YYYY-MM|YYYY>
period-end: <YYYY-MM|YYYY>
honours: <free | null>
url: <institution url | null>
```

### 4.4 `community`  (volunteering)

```yaml
organisation: <name>
role: <position>
period-start: <YYYY-MM|YYYY>
period-end: <YYYY-MM|YYYY|present>
location: <City, Country | null>
url: <community url | null>
```

### 4.5 `open-source`

```yaml
title: <name>
repo-url: <url>
role: <author|maintainer|contributor>
period-start: <YYYY-MM|YYYY>
period-end: <YYYY-MM|YYYY|present>
tech: [ ... ]
keywords: [ ... ]
```

### 4.6 `award`

```yaml
title: <award name>
awarder: <issuer>
date: <YYYY-MM|YYYY>
url: <url | null>
```

### 4.7 `publication`

```yaml
title: <publication title>
publisher: <name>
date: <YYYY-MM|YYYY>
url: <doi/url | null>
authors: [ <name>, ... ]
```

### 4.8 `identity`

Two subtypes, two files at `<variant>/identity/`:

```yaml
# headline.md
subtype: headline
# body = single line, the headline statement (e.g. "Technical Co-founder & CTO — two decades shipping platforms in DAP, fintech, telco, and banking")

# about.md
subtype: about
# body = 2-4 sentences, the professional summary; first sentence MUST include the target job title (ATS rule)
```

### 4.9 `skill`

Single file `<variant>/skills.md`. Body is human-readable; structured data in frontmatter:

```yaml
groups:
  - name: <category, e.g. "Leadership">
    items: [ ... ]
    level: <optional, free>
  - name: <category, e.g. "Architecture & Methods">
    items: [ ... ]
```

5–15 total items across all groups. Mix of technical and interpersonal. No proficiency bars.

### 4.10 `language`

Single file `<variant>/languages.md`. Body optional.

```yaml
languages:
  - code: <ISO 639-1>
    name: <English name>
    level: <CEFR A1..C2 | native>
    detail: <free | null>
```

### 4.11 `personal`

Single file `<variant>/personal.md`. Body optional.

```yaml
full-name: <name>
target-role: <variant-specific target job title>
email: <addr>
phone: <E.164 | null>
location: <City, Country>
profiles:
  - network: <linkedin|github|website|...>
    url: <url>
    username: <handle | null>
photo: <absolute filesystem path | vault-relative path | null>
```

The tool MUST render the personal block in the document body, NEVER in PDF/Word header or footer.

`photo:` is optional. When present, the tool MUST read the file from the
filesystem path and embed it into the rendered output. Canonical source for
the photo path is `master/personal.md`; until the tool reads
`master/` directly, each `publish/<variant>/personal.md` mirrors the
same value.

Excluded by hard rule: age, marital status, full street address, religion, salary expectation.

## 5. Variant root file — `variant.md`

One per `publish/<variant>/` folder. Carries variant identity + rendering directives.

```yaml
type: variant
name: <variant slug, e.g. founder-cto>
title: <human readable, e.g. "Founder-CTO">
target-role: <free, e.g. "Technical Co-founder & CTO">
section-order:
  - personal
  - identity
  - work-experience
  - projects
  - skills
  - education
  - community
  - open-source
  - awards
  - publications
  - languages
lang: en
source-master: master
output-targets: [json-resume, europass-xml, pandoc-pdf]   # informational
```

`section-order` uses the bare `type:` value. The `identity` slot covers the `about` subtype only — the `headline` subtype is rendered as the document title block above the candidate name (see §7.4) and is not addressable via `section-order`. Sections with zero atoms in scope are skipped silently.

The body of `variant.md` MAY hold a 1–2 sentence positioning note (elevator). The tool MAY surface it as a cover-summary or ignore it; spec does not mandate either.

## 6. Body content rules

The tool treats the body as opaque markdown. It drops the body verbatim into the section assigned by `type:`.

### 6.1 What the body holds

- CV-ready public prose and bullets, hand-tailored per variant tone.
- Markdown allowed: paragraphs, `-` bullets, `**bold**`, `_italic_`, inline `` `code` ``, links `[text](url)`, one leading `>` blockquote (treated as headline of the atom by some output targets).
- HTML comments `<!-- ... -->` allowed for provenance notes (e.g. `<!-- src: master/experience/acmecorp-2024.md §CV bullet -->`). The tool MUST strip comments before rendering.

### 6.2 What the body MUST NOT hold

- Level-1 headings (`# ...`). The tool owns the section title. Level-2 and level-3 headings are permitted only when the output target supports nested headings; default authoring avoids them.
- Structured metadata duplicated from frontmatter (dates, employer name, job title).
- Master-v02 analytical sections (org-scope analysis, tech-stack listings, hands-on-profile commentary) — those stay private.
- Voice-to-text artefacts (filler, restarts, garbled proper nouns). Clean before inline.
- Tables (except where Skills section is rendered as a multi-column list by the tool target).
- HTML, photos, infographics, proficiency bars, charts.
- Special characters that confuse ATS parsing (em-dash, en-dash, smart quotes are tolerated when the tool target is PDF; otherwise prefer ASCII).
- Salary, exact ARR/revenue, reputational-risk numbers (see §10 Privacy hard rules).
- Internal feature codenames flagged private by the source `master` `source-note:` field.

### 6.3 Length targets

| Atom type | Body length |
|---|---|
| `identity/headline.md` | 1 line |
| `identity/about.md` | 2–4 sentences, the Professional Summary; first sentence MUST contain the target job title |
| `work-experience` | 1 short context sentence + 3–6 outcome bullets (1 main responsibility + 2–3 quantified achievements) |
| `project` | 1–3 bullets |
| `community` | 1–2 bullets |
| `open-source` | 1–2 bullets |
| `award` | 1 line |
| `publication` | 1 line |
| `skills` body | optional intro line; data lives in frontmatter |
| `languages` body | optional; data lives in frontmatter |
| `personal` body | none |
| `variant.md` body | 1–2 positioning sentences |

### 6.4 Tone register

Author the body in **public register**: complete sentences, narrative arc, lifted polish, idioms when register matches, frank numbers when public-safe. Active voice. Strong action verbs. No filler ("just", "really", "basically"). No hedging. Bullets dense and copy-paste-ready.

Bodies are written by hand or by a non-caveman assistant. Caveman-mode output is not acceptable for atom bodies.

### 6.5 Per-variant tone hooks

| Variant | Lead with | De-emphasise |
|---|---|---|
| founder-cto | 0→1 bets, deliberate tech wagers, ownership through fades, bridge role, fundraise-adjacent | corporate ladder, headcount theatre |
| vp-eng | org-scaling, integration retention, cross-team mandate, hiring + structure | hands-on code commits |
| architect | Event Sourcing (ES), Domain-Driven Design (DDD), CQRS/DCB, platform foundations, cross-team architecture, AI/ML stack design | people management, P&L |
| product-owner | bridge between product and engineering, customer outcomes, discovery loops, requirements-to-shipping | low-level infra |

## 7. ATS rules (binding on author and tool)

Derived from the ATS-friendly-resume and what-to-include-in-a-resume sources (see frontmatter).

### 7.1 File format
- Tool MUST emit non-image PDF or DOCX as primary output targets. Image-based PDFs are forbidden.
- Tool MAY emit JSON Resume and Europass XML as data targets.

### 7.2 Layout
- Single-column, top-to-bottom, left-to-right.
- Multi-column is permitted **only** inside the Skills section.
- Reverse-chronological resume format only (no functional, no hybrid).
- Consistent spacing.

### 7.3 Typography
- Standard fonts only: Times New Roman, Arial, Calibri, Helvetica.
- No decorative or unusual fonts.
- No white text, no hidden text.

### 7.4 Section headings — canonical taxonomy

The tool MUST render these exact headings (no synonyms):

| `type:` | Rendered heading |
|---|---|
| `personal` | **Personal Information** |
| `identity` subtype `about` | **Professional Summary** (or **Objective** when `variant.md` declares `summary-mode: objective`) |
| `work-experience` | **Work Experience** |
| `project` | **Projects** |
| `skill` | **Skills** |
| `education` | **Education** |
| `community` | **Volunteering** |
| `open-source` | **Open Source** (collapse into **Projects** if `variant.md` declares `collapse-open-source: true`) |
| `award` | **Awards and Achievements** |
| `publication` | **Publications** |
| `language` | **Languages** |

`identity` subtype `headline` is rendered as the document title block above the candidate name (not a section).

### 7.5 Section order

Default `section-order` (used when `variant.md` omits the field):

```
personal → identity (about) → work-experience → projects → skills → education → community → open-source → awards → publications → languages
```

The tool MUST honor `section-order` from `variant.md` when present. Sections with zero atoms are skipped (no empty headings rendered).

### 7.6 Contact placement

- Personal Information block lives in the document body, never in a PDF/Word header or footer.
- The first sentence of `identity/about.md` body MUST include the `target-role` string from `personal.md` (verbatim or near-verbatim) to maximise ATS keyword match on the title.

### 7.7 Date format

- Frontmatter accepts `YYYY-MM`, `YYYY`, or `present`.
- Tool renders `MM/YYYY` (zero-padded) for `YYYY-MM`. Bare `YYYY` renders as `YYYY`. `present` renders as `Present`.
- Consistent across the document.

### 7.8 Work-experience entry format

Tool render contract per entry:

```
<position> · <employer> · <City, Country>
<MM/YYYY> – <MM/YYYY|Present>
<body verbatim>
```

The body's first bullet (or first sentence) is the context line; the remaining bullets are quantified achievements.

### 7.9 Skills section format

- Organize into named groups (per frontmatter `groups`).
- Render as simple lists. Multi-column is the only place it is permitted.
- No skill proficiency bars, no charts, no visual indicators.
- 5–15 items total across all groups (soft target, hard ceiling 20).

### 7.10 Keyword discipline

Binding on the author:
- Target-role keywords from the job posting appear 2–3 times across the document, distributed naturally.
- Include both full term and acronym on first occurrence: `Digital Adoption Platform (DAP)`, `Event Sourcing (ES)`.
- Use the exact language from the job posting; avoid clever synonyms.
- Every bullet leads with a strong action verb (`Led`, `Shipped`, `Architected`, `Scaled`, `Integrated`, `Founded`, `Rebuilt`, `Delivered`).
- Quantify outcomes when public-safe.

### 7.11 Forbidden content

- Tables (outside Skills).
- Charts, graphs, infographics.
- Skill proficiency bars or visual indicators.
- Alternative or creative section titles.
- White/hidden text.
- Age, marital status, full street address, religion, salary, references-on-request.

Photos are NOT forbidden in this spec. When emitting a strict-ATS target (US/UK PDF/DOCX through Workday-class parsers), the tool SHOULD drop the photo to preserve parse cleanliness; Europass XML and EU-convention PDF templates SHOULD include it.

## 8. Output schema hooks

The tool maps frontmatter + body to output targets. Detailed field maps live in tool configuration; this spec fixes the contract surface.

### 8.1 JSON Resume

```
personal              → basics (name, email, phone, location, profiles)
identity (about)      → basics.summary (body text, comments stripped)
identity (headline)   → basics.label
work-experience       → work[]   (name=employer, position, url, startDate, endDate, summary, highlights)
project               → projects[]
education             → education[]
skill (groups)        → skills[]
language              → languages[]
community             → volunteer[]
open-source           → projects[] OR a separate section per tool config
award                 → awards[]
publication           → publications[]
```

Body convention for JSON Resume:
- Leading `>` blockquote, if present, becomes the atom's headline / `summary` first line.
- Paragraph lines (non-bullet) concatenate into `summary` string.
- Lines starting with `- ` become `highlights[]` array entries.

### 8.2 Europass XML

```
personal              → Identification
identity (headline)   → Headline.Description
identity (about)      → PersonalDescription
work-experience       → WorkExperience (each entry)
project               → WorkExperience nested under parent-experience, or standalone if parent-experience is null
education             → Education
skill (groups)        → Skills (mapped to JobRelated, Digital, Communication, Organisational by group name convention or by frontmatter group meta `europass-bucket:`)
language              → Skills.Linguistic
community             → WorkExperience with `<Volunteer>true</Volunteer>` flag
open-source           → WorkExperience (volunteer flag) OR Skills.JobRelated, by tool config
award                 → Honour
publication           → Publication
```

Dates render in `YYYY-MM-DD` form (synthesise `-01` for day when frontmatter has only `YYYY-MM`).

### 8.3 Pandoc PDF / DOCX

- Frontmatter populates a YAML metadata block consumed by the chosen Pandoc template (e.g. eisvogel, awesome-cv).
- Body markdown passes through Pandoc's markdown reader directly.
- Section headings rendered per §7.4 canonical taxonomy.

## 9. Validation rules

The tool MUST validate at ingestion. The author SHOULD run the same checks before commit.

Schema:
- Frontmatter passes the relevant JSON Schema in `_schema/`.
- `type:` matches the schema file.
- `name:` is unique within the variant folder.
- `source:` slug exists in `master/` (file present), unless null for variant-only atoms.

Ordering:
- Within `work-experience`, sort by `period-start` descending. Ties broken by `order:` ascending.
- Within `project`, sort by `period-start` descending unless grouped under a parent `work-experience` (then by parent first, then by `period-start`).
- `section-order` from `variant.md` drives section sequence.

Visibility:
- Tool skips any atom with `visibility != public`.

Body lint:
- No level-1 heading.
- No banned strings (configurable list: salary keywords, internal feature codenames flagged in `master` `source-note:`).
- Every bullet's first word is a strong action verb (action-verb list configurable).
- Acronyms appear with full term on first occurrence in the document (cross-atom check at render time).

Date lint:
- `period-end >= period-start` (string compare on `YYYY-MM`).
- `present` only valid on the most recent `work-experience` and on still-active `community` / `open-source` entries.

## 10. Privacy hard rules

Per `communication profile.md`:

- Never emit salary, salary expectation, or exact compensation.
- Never emit exact ARR / revenue / earn-out figures unless explicitly marked public-safe in the source.
- Generalise team sizes when reputational risk applies
- Never name internal feature codenames flagged in `master` `source-note:`
- Never include phone country-detail beyond what `personal.md` declares.
- No personal identifiers beyond name, professional email, professional location (City, Country), and public profile URLs.

These rules bind both the author (at body authoring time) and the tool (rejects atoms that fail).

## 11. Generation workflow

Editing order:

1. Edit `master/` first. This is the canonical source.
2. For each variant `publish/<variant>/`:
   1. Select the source slugs that fit the variant (see §6.5 tone hooks).
   2. For each selected slug, derive an atom file:
      - Copy structured fields from the master frontmatter into the variant frontmatter.
      - Write a fresh, public-ready body in the per-variant tone register.
      - Set `source:` to the master slug for traceability.
      - Set `order:` if needed to override default sort.
   3. Write or update `variant.md` (identity, `section-order`, `target-role`).
   4. Run validation (§9).
3. The render tool consumes `publish/<variant>/` only and emits the output target.

Re-derivation:
- When `master/` changes substantially (new role, new project), re-derive the affected atoms across all variants.
- Cosmetic edits to master (typo, dates) do not force re-derivation; periodic sync is sufficient.

Authorship discipline:
- Bodies are NOT generated by caveman-mode tooling.
- Bodies SHOULD pass an acronym-on-first-use check and an action-verb-lead check before commit.

## 12. Initial variants

Four variants in scope:

| Variant slug | Title | Target role |
|---|---|---|
| `founder-cto` | Founder-CTO | Technical Co-founder & CTO |
| `vp-eng` | VP Engineering | VP / Director of Engineering, post-acquisition integration |
| `architect` | Principal/Staff Architect | Principal / Staff / Solution Architect |
| `product-owner` | Product Owner / Manager | Senior PO / Product Manager, technical product roles |

`founder-cto` is the primary per current job-targeting. Build order: `founder-cto` → `vp-eng` → `architect` → `product-owner`.

## 13. Glossary

- **Atom** — one markdown file in a variant folder, representing one entity (one job, one project, one award …).
- **Variant** — one role-targeted CV folder under `publish/`.
- **Source slug** — the `name:` slug of a master atom, referenced from variant atoms via `source:`.
- **Section order** — the sequence of rendered sections in the output, declared in `variant.md`.
- **Output target** — a concrete format the render tool emits (JSON Resume, Europass XML, Pandoc PDF, DOCX, …).

