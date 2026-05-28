import type { FC, PropsWithChildren } from 'hono/jsx';

export const Layout: FC<PropsWithChildren<{ title: string; sseClient?: boolean }>> = ({
  title,
  sseClient,
  children,
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href="/static/styles.css" />
      <script src="/static/htmx.min.js"></script>
      {sseClient ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const es = new EventSource('/events');
              es.addEventListener('reload', () => location.reload());
              es.addEventListener('error', () => {});
              es.addEventListener('parse-error', (e) => {
                const data = JSON.parse(e.data || '{}');
                let banner = document.getElementById('parse-error-banner');
                if (!banner) {
                  banner = document.createElement('div');
                  banner.id = 'parse-error-banner';
                  banner.className = 'cv-error-banner';
                  banner.setAttribute('role', 'alert');
                  banner.style.position = 'fixed';
                  banner.style.top = '0';
                  banner.style.left = '0';
                  banner.style.right = '0';
                  banner.style.zIndex = '9999';
                  document.body.prepend(banner);
                }
                banner.replaceChildren();
                const title = document.createElement('p');
                title.className = 'cv-error-title';
                title.textContent = 'Parse error';
                banner.appendChild(title);
                const body = document.createElement('p');
                if (data.file) {
                  const code = document.createElement('code');
                  code.textContent = data.file;
                  body.appendChild(code);
                  body.appendChild(document.createTextNode(' — '));
                }
                body.appendChild(document.createTextNode(data.message || 'unknown error'));
                banner.appendChild(body);
              });
            `,
          }}
        />
      ) : null}
    </head>
    <body>{children}</body>
  </html>
);
