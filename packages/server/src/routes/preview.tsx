import { Hono } from 'hono';
import { Layout } from '../render/Layout.js';
import { CV } from '../render/CV.js';
import { ErrorBanner } from '../render/ErrorBanner.js';
import { getActiveSource, sourceAvailability } from '../sources.js';
import { loadSource } from '../parse/index.js';

export const previewRoutes = new Hono();

previewRoutes.get('/preview', async (c) => {
  const source = await getActiveSource();
  if (!source) {
    return c.html(
      <Layout title="Preview" sseClient>
        <div class="cv-error-banner">No active source. Pick one in the shell.</div>
      </Layout>,
    );
  }
  if (sourceAvailability(source) !== 'ok') {
    return c.html(
      <Layout title="Preview" sseClient>
        <ErrorBanner errors={[{ file: source.path, message: `source unavailable (${sourceAvailability(source)})` }]} />
      </Layout>,
    );
  }

  const result = await loadSource(source.path);
  if (!result.ok) {
    return c.html(
      <Layout title="Preview" sseClient>
        <ErrorBanner errors={result.errors} />
      </Layout>,
    );
  }

  return c.html(
    <Layout title={`${result.cv.profile.name} — CV`} sseClient>
      {result.warnings.length > 0 ? <ErrorBanner errors={result.warnings} /> : null}
      <CV cv={result.cv} />
    </Layout>,
  );
});
