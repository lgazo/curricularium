# Curricularium — Design Spec

- **Date:** 2026-05-28
- **Status:** Draft, awaiting user review
- **Scope:** First iteration (v1)

## 1. Goal

A small local web app that turns a directory of markdown files (with frontmatter) into a fancy HTML CV. The CV uses a LinkedIn-inspired structure with a modern custom design. The user previews in the browser and exports to PDF via the browser's print dialog.

The markdown source format is being defined in a parallel session. This spec targets a placeholder typed model and a sensible default directory convention; both adapt when the real schema lands.

## 2. Constraints & non-goals

**In scope (v1):**
- pnpm workspace monorepo, single package now (`packages/server`).
- Node.js runtime, TypeScript strict.
- Hono web server + HTMX UI shell.
- `hono/jsx` for templating.
- Multiple source directories registered in a local config; one active at a time, switched via UI.
- LinkedIn-spiritual layout: dark sidebar (photo, name, headline, contact, skills chips) + main column (about, experience timeline, education).
- Live reload of preview via SSE driven by a chokidar watcher on the active source.
- PDF export via browser print (`window.print()` + `@media print` CSS).
- Sections in v1: header, about, experience, education, skills.

**Out of scope (v1):**
- Authentication, multi-user / multi-tenant, hosting.
- Server-side PDF rendering (headless Chromium, pdfkit, etc.).
- In-browser markdown editing.
- Additional templates / theme switcher in UI.
- Projects, certifications, languages sections.
- Internationalization.
- Automated tests (unit, integration, or e2e). Manual smoke-test only for v1.

## 3. Architecture

### 3.1 Repo layout

```
curricularium/
├── pnpm-workspace.yaml             # packages: ['packages/*']
├── package.json                    # root, dev tooling
├── tsconfig.base.json
├── packages/
│   └── server/                     # @curricularium/server
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts            # Hono app entry (@hono/node-server)
│       │   ├── config.ts           # load/save ~/.config/curricularium/config.json
│       │   ├── sources.ts          # CRUD over registered source dirs
│       │   ├── model.ts            # CV type + Zod schema (placeholder)
│       │   ├── parse/              # markdown → CV typed model
│       │   ├── render/             # JSX components (template, layout)
│       │   ├── routes/             # Hono routes (UI + HTMX fragments + SSE)
│       │   ├── watcher.ts          # chokidar + SSE broadcaster
│       │   └── static/             # CSS, HTMX dist, fonts
│       └── README.md
└── docs/superpowers/specs/
```

The workspace shape supports later extraction into `packages/core` (parse + model) and `packages/templates` (extra designs) without restructuring.

### 3.2 Tech choices

| Concern        | Choice                                                      |
|----------------|-------------------------------------------------------------|
| Runtime        | Node.js (via `@hono/node-server`)                           |
| Language       | TypeScript, strict mode                                     |
| Web framework  | Hono                                                        |
| Templating     | `hono/jsx` (server-rendered JSX, no client framework)       |
| UI interactivity | HTMX                                                      |
| Markdown       | `gray-matter` (frontmatter) + `marked` (body)               |
| Validation     | `zod`                                                       |
| File watching  | `chokidar`                                                  |
| Styling        | Hand-written CSS, served as static file                     |
| PDF            | Browser print + `@media print` CSS                          |
| Tests          | None for v1                                                 |

### 3.3 Render pipeline (eager parse on request)

On each `GET /preview`:

1. Read active source dir from config.
2. Glob `*.md` per known section folder; read all files.
3. For each file: `gray-matter` → `{ frontmatter, body }`; `marked` → HTML for the body.
4. Validate & assemble into a `CV` object via Zod.
5. Sort `experience` and `education` by `start` desc.
6. Render `<CV/>` JSX → HTML string → return.

CV trees are small (dozens of files). Re-parsing per request keeps state simple. No cache layer.

## 4. Data model

`packages/server/src/model.ts`. Placeholder shape until the parallel session lands the real schema.

```ts
export type CV = {
  profile: {
    name: string;
    headline: string;
    photo?: string;                 // path relative to source dir
    location?: string;
    contact: {
      email?: string;
      phone?: string;
      website?: string;
      linkedin?: string;
      github?: string;
    };
  };
  about?: string;                   // rendered HTML
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    start: string;                  // ISO YYYY-MM
    end: string | "Present";
    bullets: string[];              // rendered HTML strings
  }>;
  education: Array<{
    school: string;
    degree: string;
    field?: string;
    start: string;                  // ISO YYYY-MM
    end: string;
    notes?: string;                 // rendered HTML
  }>;
  skills: Array<{ group?: string; items: string[] }>;
};
```

A Zod schema mirrors the type and is the single validation point. Validation failures bubble up as structured errors with `file` + `field` for the UI banner.

## 5. Source directory convention

Default expected layout inside a registered source directory:

```
<source>/
├── profile.md           # frontmatter: name, headline, photo, location, contact.*
├── about.md             # body = about text (markdown)
├── experience/          # one file per role
│   ├── 2021-acme.md     # frontmatter: company, title, start, end, location; body = bullets
│   └── 2018-globex.md
├── education/           # one file per entry; frontmatter + optional notes body
└── skills.md            # frontmatter: groups [{ group, items }] or top-level items
```

This convention is owned by the parser. When the parallel session finalizes the schema, the parser (and Zod schema) is updated; templates stay stable as long as the `CV` shape stays stable.

Photos and other assets live inside the source directory. They are served by a guarded route (see §7).

## 6. Source management & config

### 6.1 Config file

Location: `$XDG_CONFIG_HOME/curricularium/config.json`, fallback `~/.config/curricularium/config.json`, fallback `~/.curricularium/config.json`. Loaded at startup, written on every change.

```json
{
  "sources": [
    {
      "id": "ulid",
      "name": "Personal CV",
      "path": "~/cv-data",
      "addedAt": "2026-05-28T10:00:00Z"
    }
  ],
  "activeSourceId": "ulid"
}
```

If `activeSourceId` is missing or invalid, no source is active and the preview pane shows an empty-state.

### 6.2 First-run flow

Empty `sources` → UI shows only the "Add a source" form. On successful add, that source becomes active automatically.

### 6.3 Add-source validation

A POST to `/sources` rejects unless:
- `path` exists,
- is a directory,
- is readable by the process,
- contains at least `profile.md`.

Failures return an HTMX fragment with an inline error message.

### 6.4 Inactive / missing sources

If a registered source path no longer exists at runtime, the source row in the picker shows a red state with a "Reattach" CTA. Activation is blocked until reattached or replaced.

## 7. HTTP API

| Method | Path                       | Purpose                                                                 |
|--------|----------------------------|-------------------------------------------------------------------------|
| GET    | `/`                        | Main shell page (source picker + preview frame)                         |
| GET    | `/sources`                 | HTMX fragment: list of source rows                                      |
| POST   | `/sources`                 | Add a source (form: `name`, `path`); returns fragment or inline error   |
| DELETE | `/sources/:id`             | Remove a source; HTMX swaps the row out                                 |
| POST   | `/sources/:id/activate`    | Set active source; HTMX swaps preview frame                             |
| GET    | `/preview`                 | Full CV render of the active source (standalone page, no shell chrome)  |
| GET    | `/source-asset/*`          | Serves an asset (e.g., photo) from active source dir, path-traversal guarded |
| GET    | `/events`                  | SSE stream for live reload                                              |
| GET    | `/static/*`                | App CSS, HTMX bundle, fonts                                             |

Routes that return HTMX fragments emit bare partials (no `<Layout>`). `GET /` and `GET /preview` return full HTML documents.

## 8. Render layer

```
src/render/
├── Layout.tsx           # <html>, <head>, CSS link, HTMX <script>, SSE client (preview only)
├── Shell.tsx            # source picker + preview frame (mounted by GET /)
├── CV.tsx               # full CV page = Sidebar + Main
├── Sidebar.tsx          # photo, name, headline, contact, skills chips
├── Main.tsx             # about + experience + education
├── ExperienceItem.tsx
├── EducationItem.tsx
└── (styles in src/static/styles.css)
```

The shell embeds the preview via `<iframe src="/preview">`. HTMX bundles ship from `/static/` (vendored at install time), not from a CDN, because the app runs offline.

### 8.1 Layout (template B)

CSS Grid, two columns:
- Sidebar: fixed width (~280px), dark background, light text.
- Main: flexible width, light background, dark text.

CSS variables in `:root` for sidebar bg, accent color, base font, headline font.

### 8.2 Markdown injection

Body fields (`about`, experience `bullets`, education `notes`) are pre-rendered to HTML in the parse step and injected via `dangerouslySetInnerHTML`.

**Trust boundary (v1):** the app is local-only, single-user, bound to localhost; markdown source files are owned by the user running the server. No untrusted input reaches the render path, so no HTML sanitizer is installed. Raw HTML in markdown is allowed and rendered as-is.

The README must state this trust assumption explicitly. If scope ever grows to multi-user, hosting, or importing third-party markdown, a sanitizer (e.g., DOMPurify) must be added before that change ships.

### 8.3 Assets

Photo and other source-relative assets are served by `GET /source-asset/*`. The handler resolves the requested path against the active source dir and rejects any path that escapes the source root (`path.relative` containing `..`).

## 9. Live reload (SSE)

### 9.1 Watcher

`chokidar.watch(activeSourcePath, { ignored: /(^|[\/\\])\../ })`, glob includes `**/*.md` and common image extensions. Events debounced 150ms.

Lifecycle: when the active source changes, the previous watcher is closed before a new one starts. Exactly one watcher runs at a time.

### 9.2 SSE channel

`GET /events` keeps the connection open and broadcasts `event: reload\ndata: {}` on debounced change. Client side (in the preview `<Layout/>`, ~10 lines):

```js
const es = new EventSource('/events');
es.addEventListener('reload', () => location.reload());
es.addEventListener('error', () => { /* EventSource auto-reconnects */ });
```

Page reload (rather than DOM diffing) is adequate — CV renders sub-second.

### 9.3 Parse errors during reload

A reload-triggered parse failure pushes `event: error\ndata: { message, file }` on the SSE channel. The preview page shows a top banner with the message and keeps the previous CV visible. The next save attempts another reload.

### 9.4 Connection bookkeeping

A `Set` of active SSE controllers is held server-side; entries are removed on `close`. Switching the active source does not close clients — they receive reloads from the new watcher.

## 10. PDF export

No server-side PDF code path.

User flow:
1. View `/preview` in Chromium.
2. Either: focus the preview iframe and press `Ctrl+P`, or click the shell's Print button (which calls `iframe.contentWindow.print()`), or open `/preview` directly in a new tab and print there.
3. Browser print dialog → "Save as PDF" → file.

Print CSS lives in `styles.css`:

- `@page { size: A4; margin: 12mm; }`
- `@media print { .no-print { display: none; } }`
- `break-inside: avoid` on `.experience-item`, `.education-item`, section headings.
- `-webkit-print-color-adjust: exact; print-color-adjust: exact;` to keep the dark sidebar in PDF.

README documents Chromium-based browsers as the supported target for best print fidelity.

## 11. Error handling

| Failure                          | Surface                                                          |
|----------------------------------|------------------------------------------------------------------|
| Source path missing (startup or runtime) | Source row marked inactive; "Reattach" CTA; activation blocked until resolved |
| `POST /sources` invalid input    | HTMX inline error fragment in the form                           |
| Frontmatter missing required key | Preview banner listing file path + Zod issue(s)                  |
| Markdown body render failure     | Per-section red box; rest of CV still renders                    |
| Watcher event during parse       | Latest event wins (debounced); no event queue                    |
| SSE disconnect                   | Browser `EventSource` auto-reconnect; no app-level retry         |

## 12. Testing

Deferred. v1 ships with manual smoke-testing only:

1. Run server against a fixture source dir.
2. Verify `/preview` renders, sidebar + main correct, sections in expected order.
3. Edit a file in the source; confirm SSE-driven reload happens.
4. Print preview to PDF in Chromium; eyeball output.

Test harness (e.g., Playwright) is added in a later iteration once the schema and layout stabilize.

## 13. Open questions (to revisit when relevant)

- Real source schema from parallel session — parser and Zod schema will be updated when it lands.
- Whether to keep the dark sidebar in PDF after seeing real-world output (currently: yes, per WYSIWYG choice).
- When to extract `packages/core` and `packages/templates` (after second template exists).
