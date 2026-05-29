import { registerOutput } from './registry.js';
import { rawTheme } from './jsonresume/themes/raw.js';
import { communityThemes } from './jsonresume/themes/community.js';
import { canonicalTheme } from './europass/themes/canonical.js';

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
  themes: [rawTheme, ...communityThemes],
  defaultThemeId: 'raw',
});

registerOutput({
  id: 'europass',
  label: 'Europass XML',
  autoWriteOnRender: false,
  themes: [canonicalTheme],
  defaultThemeId: 'canonical',
});
