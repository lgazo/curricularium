import type { FC } from 'hono/jsx';
import type { Source } from '../config.js';

type Props = {
  sources: Source[];
  activeSourceId: string | null;
  availability: Record<string, 'ok' | 'missing' | 'unreadable'>;
  addSourceError?: string;
};

export const Shell: FC<Props> = ({ sources, activeSourceId, availability, addSourceError }) => (
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
          {addSourceError ? <div class="add-source-error">{addSourceError}</div> : null}
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
