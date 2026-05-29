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
