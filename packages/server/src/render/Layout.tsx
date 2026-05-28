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
            `,
          }}
        />
      ) : null}
    </head>
    <body>{children}</body>
  </html>
);
