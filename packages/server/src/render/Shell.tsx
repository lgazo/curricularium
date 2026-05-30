import type { FC } from 'hono/jsx';
import type { PrintConfig, Source } from '../config.js';
import type { VariantSummary, OutputDef, ThemeDef } from '@curricularium/core';
import { isThemePkgInstalled } from '@curricularium/core';
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
  print: PrintConfig;
  lastGenerated?: { variant: string; output: string; theme: string; path: string } | null;
};

function themeAvailable(t: ThemeDef): boolean {
  return !t.pkg || isThemePkgInstalled(t.pkg);
}

function suffixFor(t: ThemeDef): string {
  return themeAvailable(t) ? '' : ' ⬇';
}

export function renderThemeOptions(themes: ThemeDef[], activeId: string | null) {
  const opt = (t: ThemeDef) => (
    <option value={t.id} selected={t.id === activeId}>{t.label}{suffixFor(t)}</option>
  );

  const favorites = themes.filter((t) => t.favorite);
  const rest = themes.filter((t) => !t.favorite);
  const installed = rest.filter(themeAvailable);
  const downloadable = rest.filter((t) => !themeAvailable(t));

  const groups: unknown[] = [];
  if (favorites.length > 0) {
    groups.push(<optgroup label="Favorites">{favorites.map(opt)}</optgroup>);
  }
  if (installed.length > 0) {
    groups.push(<optgroup label="Installed">{installed.map(opt)}</optgroup>);
  }
  if (downloadable.length > 0) {
    groups.push(
      <optgroup label="Available (download on use)">{downloadable.map(opt)}</optgroup>,
    );
  }
  return <>{groups}</>;
}

const PAGE_SIZES = ['A4', 'A3', 'A5', 'Letter', 'Legal'] as const;

const PrintConfigSection: FC<{ print: PrintConfig }> = ({ print }) => (
  <section class="shell-print-config">
    <h2>Print</h2>
    <form
      hx-post="/print-config"
      hx-target="body"
      hx-swap="outerHTML"
      class="shell-print-config-form"
    >
      <label class="cb shell-print-master">
        <input type="checkbox" name="enabled" value="1" checked={print.enabled} />
        <strong>Enable print styling</strong>
      </label>

      <fieldset>
        <legend>Page</legend>
        <label>Size
          <select name="pageSize">
            {PAGE_SIZES.map((s) => (
              <option value={s} selected={s === print.pageSize}>{s}</option>
            ))}
          </select>
        </label>
        <label>Margin (mm)
          <input type="number" name="marginMm" min="0" max="50" step="1" value={String(print.marginMm)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Entry grouping</legend>
        <label class="cb">
          <input type="checkbox" name="useEntryGrouping" value="1" checked={print.useEntryGrouping} />
          Keep entries together (master switch)
        </label>
        <label>Semantic entry selectors
          <input type="text" name="semanticEntrySelectors" value={print.semanticEntrySelectors} placeholder="article, li" />
        </label>
        <label class="cb">
          <input type="checkbox" name="useDirectHeadingEntries" value="1" checked={print.useDirectHeadingEntries} />
          Detect entries via direct heading child (<code>:has(&gt; h:first-child)</code>)
        </label>
        <label class="cb">
          <input type="checkbox" name="useNestedHeadingEntries" value="1" checked={print.useNestedHeadingEntries} />
          Detect entries via nested heading (costs ~30% more pages on styled-components themes)
        </label>
        <label>Entry heading selectors
          <input type="text" name="entryHeadingSelectors" value={print.entryHeadingSelectors} placeholder="h3, h4" />
        </label>
        <label>Extra avoid-break selectors
          <input type="text" name="extraAvoidSelectors" value={print.extraAvoidSelectors} placeholder=".my-item, .keep-together" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Headings</legend>
        <label class="cb">
          <input type="checkbox" name="keepHeadingsWithContent" value="1" checked={print.keepHeadingsWithContent} />
          Keep headings with content (no break after heading)
        </label>
        <label>Heading selectors
          <input type="text" name="headingSelectors" value={print.headingSelectors} />
        </label>
        <label class="cb">
          <input type="checkbox" name="keepHeadingNextBlock" value="1" checked={print.keepHeadingNextBlock} />
          Keep heading + next block on same page
        </label>
      </fieldset>

      <fieldset>
        <legend>Top sections</legend>
        <label class="cb">
          <input type="checkbox" name="forcePageBreakBeforeTopSections" value="1" checked={print.forcePageBreakBeforeTopSections} />
          New page per top section
        </label>
        <label>Top section selector
          <input type="text" name="topSectionSelector" value={print.topSectionSelector} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Typography</legend>
        <label>Orphans
          <input type="number" name="orphans" min="1" max="10" step="1" value={String(print.orphans)} />
        </label>
        <label>Widows
          <input type="number" name="widows" min="1" max="10" step="1" value={String(print.widows)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Other</legend>
        <label class="cb">
          <input type="checkbox" name="printBackgrounds" value="1" checked={print.printBackgrounds} />
          Print backgrounds & colors
        </label>
        <label class="cb">
          <input type="checkbox" name="hideLinkUrls" value="1" checked={print.hideLinkUrls} />
          Hide link URLs (some themes append them)
        </label>
        <label>Custom CSS
          <textarea name="customCss" rows={4} placeholder="@media print { ... }">{print.customCss}</textarea>
        </label>
      </fieldset>

      <div class="shell-print-config-actions">
        <button type="submit">Apply</button>
        <button
          type="submit"
          name="reset"
          value="1"
          formnovalidate
          class="shell-print-config-reset"
        >
          Reset
        </button>
      </div>
    </form>
  </section>
);

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
          onclick="window.printPreviewFrame && window.printPreviewFrame()"
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
                <select
                  name="output"
                  hx-get="/themes"
                  hx-trigger="change"
                  hx-target="#theme-select"
                  hx-swap="innerHTML"
                >
                  {p.outputs.map((o) => (
                    <option value={o.id} selected={o.id === p.activeOutputId}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label>Theme
                <select id="theme-select" name="theme">
                  {renderThemeOptions(activeOutput?.themes ?? [], p.activeThemeId)}
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

        <PrintConfigSection print={p.print} />
      </aside>

      <div class="shell-resizer no-print" role="separator" aria-orientation="vertical" title="Drag to resize" />

      <section class="shell-preview">
        {p.activeSourceId && p.activeVariantName ? (
          <iframe id="preview-frame" src={`/preview${previewQS}`} title="CV preview" />
        ) : (
          <div class="shell-empty">No variant selected. Pick one on the left.</div>
        )}
      </section>

      <script dangerouslySetInnerHTML={{ __html: SHELL_RESIZER_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: SHELL_PRINT_SCRIPT }} />
    </div>
  );
};

const SHELL_PRINT_SCRIPT = `
(function(){
  function doPrint(){
    var f = document.getElementById('preview-frame');
    if (!f || !f.contentWindow) { window.print(); return; }
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch (_) { window.print(); }
  }
  window.printPreviewFrame = doPrint;
  window.addEventListener('keydown', function(e){
    var key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'p') {
      e.preventDefault();
      doPrint();
    }
  });
})();
`;

const SHELL_RESIZER_SCRIPT = `
(function(){
  var root = document.querySelector('.shell');
  var handle = document.querySelector('.shell-resizer');
  if (!root || !handle) return;
  var MIN = 220, MAX = 800, KEY = 'shell-aside-w';
  var stored = parseInt(localStorage.getItem(KEY) || '0', 10);
  if (stored >= MIN && stored <= MAX) root.style.setProperty('--aside-w', stored + 'px');
  var dragging = false;
  function start(e){ dragging = true; handle.classList.add('dragging'); if (e.preventDefault) e.preventDefault(); }
  function move(e){
    if (!dragging) return;
    var x = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    if (x == null) return;
    var rect = root.getBoundingClientRect();
    var w = Math.max(MIN, Math.min(MAX, x - rect.left));
    root.style.setProperty('--aside-w', w + 'px');
  }
  function end(){
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    var v = root.style.getPropertyValue('--aside-w');
    var n = parseInt(v, 10);
    if (n) localStorage.setItem(KEY, String(n));
  }
  handle.addEventListener('mousedown', start);
  handle.addEventListener('touchstart', start, { passive: false });
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('mouseup', end);
  window.addEventListener('touchend', end);
})();
`;
