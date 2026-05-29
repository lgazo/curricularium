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
