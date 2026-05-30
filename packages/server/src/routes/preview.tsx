import { Hono } from 'hono';
import type { Context } from 'hono';
import { join, resolve, sep } from 'node:path';
import { Layout } from '../render/Layout.js';
import { sseClientScriptTag } from '../render/sseClient.js';
import { getActiveSource, sourceAvailability } from '../sources.js';
import { DEFAULT_PRINT_CONFIG, loadConfig, type PrintConfig } from '../config.js';
import { buildPrintCss, unwrapPrintMedia } from '../render/printCss.js';
import { loadVariant, render } from '@curricularium/core';

export const previewRoutes = new Hono();

async function handlePreview(c: Context, mode: 'screen' | 'print') {
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

  if (!/^[A-Za-z0-9._-]+$/.test(variant) || variant === '.' || variant === '..') {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">Forbidden variant name.</div>
      </Layout>,
      400,
    );
  }

  const variantRoot = resolve(join(source.path, variant));
  const sourceRoot = resolve(source.path);
  if (!variantRoot.startsWith(sourceRoot + sep) && variantRoot !== sourceRoot) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">Forbidden variant path.</div>
      </Layout>,
      400,
    );
  }
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
        <div class="cv-error-banner">Render failed: {(err as Error).message}</div>
      </Layout>,
    );
  }

  if (rr.contentType.startsWith('text/html')) {
    if (rr.bytes.length === 0) {
      return c.html(
        <Layout title="Theme failed" sseClient>
          <div class="cv-error-banner">
            <p class="cv-error-title">
              Theme "{themeId}" produced no output.
            </p>
            {rr.warnings.length > 0 ? (
              <ul>
                {rr.warnings.map((w) => (
                  <li><code>{w.file}</code> — {w.message}</li>
                ))}
              </ul>
            ) : (
              <p>Render returned empty bytes with no diagnostic. Check server logs.</p>
            )}
          </div>
        </Layout>,
      );
    }
    const themeHtml = new TextDecoder().decode(rr.bytes);
    return c.html(injectPreviewChrome(themeHtml, config.print ?? DEFAULT_PRINT_CONFIG, mode));
  }

  // JSON / XML: syntax-highlighted pre
  const text = new TextDecoder().decode(rr.bytes);
  return c.html(
    <Layout title={`${lr.cv.variant.title} — ${outputId}`} sseClient>
      <pre class="cv-output-text">{text}</pre>
    </Layout>,
  );
}

previewRoutes.get('/preview', (c) => handlePreview(c, 'print'));
previewRoutes.get('/print-preview', (c) => handlePreview(c, 'screen'));

function injectPreviewChrome(
  themeHtml: string,
  print: PrintConfig,
  mode: 'screen' | 'print',
): string {
  const sse = sseClientScriptTag();
  const printCss = buildPrintCss(print, { mode });
  let out = themeHtml;
  if (mode === 'screen') {
    out = out.replace(
      /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
      (_m, css: string) => `<style>${unwrapPrintMedia(css)}</style>`,
    );
  }
  const hasBody = /<body[^>]*>/i.test(out) && /<\/body>/i.test(out);
  if (!hasBody) {
    return `<!doctype html><html><head><meta charset="utf-8">${printCss}</head><body>${out}${sse}</body></html>`;
  }
  if (printCss) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${printCss}</head>`);
    } else {
      out = out.replace(/<body[^>]*>/i, (m) => `${m}${printCss}`);
    }
  }
  return out.replace(/<\/body>/i, `${sse}</body>`);
}
