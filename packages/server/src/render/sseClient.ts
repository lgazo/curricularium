export const SSE_CLIENT_SCRIPT = `
const params = new URLSearchParams(location.search);
const me = {
  variant: params.get('variant') || '',
  output: params.get('output') || '',
  theme: params.get('theme') || '',
};
const es = new EventSource('/events');
es.addEventListener('reload', (e) => {
  try {
    const d = JSON.parse(e.data || '{}');
    if (!me.variant || (d.variant === me.variant && d.output === me.output && d.theme === me.theme)) {
      location.reload();
    }
  } catch { location.reload(); }
});
es.addEventListener('warnings', (e) => {
  try {
    const d = JSON.parse(e.data || '{}');
    const target = document.getElementById('warnings-banner');
    if (target) target.outerHTML = d.html || '';
  } catch {}
});
es.addEventListener('parse-error', (e) => {
  let data;
  try { data = JSON.parse(e.data || '{}'); } catch { return; }
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
es.addEventListener('error', () => {});
`;

export function sseClientScriptTag(): string {
  return `<script>${SSE_CLIENT_SCRIPT}</script>`;
}
