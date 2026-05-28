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
