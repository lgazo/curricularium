import { Hono } from 'hono';
import { join } from 'node:path';
import { Layout } from '../render/Layout.js';
import { WarningsBanner } from '../render/WarningsBanner.js';
import { getActiveSource, sourceAvailability } from '../sources.js';
import { loadConfig } from '../config.js';
import { loadVariant, render } from '@curricularium/core';

export const previewRoutes = new Hono();

previewRoutes.get('/preview', async (c) => {
  const source = await getActiveSource();
  const config = await loadConfig();
  if (!source) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">No active source.</div>
      </Layout>,
    );
  }
  if (sourceAvailability(source) !== 'ok') {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">Source unavailable: {source.path}</div>
      </Layout>,
    );
  }

  const variant = c.req.query('variant') ?? config.activeVariantName;
  const outputId = c.req.query('output') ?? config.activeOutputId ?? 'html';
  const themeId = c.req.query('theme') ?? config.activeThemeId ?? 'linkedin-spiritual';

  if (!variant) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">No active variant. Pick one in the shell.</div>
      </Layout>,
    );
  }

  const variantRoot = join(source.path, variant);
  const lr = await loadVariant(variantRoot);
  if (!lr.ok) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">
          <p class="cv-error-title">Variant not loadable</p>
          <ul>{lr.errors.map((e) => (<li><code>{e.file}</code> — {e.message}</li>))}</ul>
        </div>
      </Layout>,
    );
  }

  let rr;
  try {
    rr = await render({ cv: lr.cv, outputId, themeId });
  } catch (err) {
    return c.html(
      <Layout title="Preview" sseClient>
        <WarningsBanner warnings={lr.warnings} />
        <div class="cv-error-banner">Render failed: {(err as Error).message}</div>
      </Layout>,
    );
  }

  // HTML output: return raw body (the theme already produced a full document).
  if (rr.contentType.startsWith('text/html')) {
    const html = new TextDecoder().decode(rr.bytes);
    // Inject the SSE client + warnings banner via a small DOM trick:
    // wrap output in a Layout so it gets the SSE script + banner.
    return c.html(
      <Layout title={`${lr.cv.personal?.fullName ?? lr.cv.variant.title} — CV`} sseClient>
        <WarningsBanner warnings={[...lr.warnings, ...rr.warnings]} />
        <div dangerouslySetInnerHTML={{ __html: extractBody(html) }} />
      </Layout>,
    );
  }

  // JSON / XML: syntax-highlighted pre
  const text = new TextDecoder().decode(rr.bytes);
  return c.html(
    <Layout title={`${lr.cv.variant.title} — ${outputId}`} sseClient>
      <WarningsBanner warnings={[...lr.warnings, ...rr.warnings]} />
      <pre class="cv-output-text">{text}</pre>
    </Layout>,
  );
});

function extractBody(html: string): string {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return m ? m[1]! : html;
}
