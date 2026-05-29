import { registerOutput } from './registry.js';

registerOutput({
  id: 'html',
  label: 'HTML',
  autoWriteOnRender: true,
  themes: [{
    id: 'linkedin-spiritual',
    label: 'LinkedIn Spiritual',
    contentType: 'text/html',
    filenameExt: '.html',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'linkedin-spiritual',
});

registerOutput({
  id: 'jsonresume',
  label: 'JSON Resume',
  autoWriteOnRender: false,
  themes: [{
    id: 'raw',
    label: 'Raw resume.json',
    contentType: 'application/json',
    filenameExt: '.json',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'raw',
});

registerOutput({
  id: 'europass',
  label: 'Europass XML',
  autoWriteOnRender: false,
  themes: [{
    id: 'canonical',
    label: 'Canonical Europass XML',
    contentType: 'application/xml',
    filenameExt: '.xml',
    render: async () => ({ bytes: new Uint8Array(), warnings: [] }),
  }],
  defaultThemeId: 'canonical',
});
