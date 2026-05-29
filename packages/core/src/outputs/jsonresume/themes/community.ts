import type { ThemeDef, ThemeRenderResult } from '../../registry.js';
import { specCvToJsonResume } from '../adapter.js';
import type { LoadWarning } from '../../../spec/model.js';

type CommunityThemeModule = {
  render: (resume: unknown) => string | Promise<string>;
};

async function loadCommunityTheme(pkg: string): Promise<CommunityThemeModule | null> {
  try {
    const mod = await import(pkg);
    if (typeof mod.render === 'function') return mod as CommunityThemeModule;
    if (mod.default && typeof mod.default.render === 'function') return mod.default as CommunityThemeModule;
  } catch {
    return null;
  }
  return null;
}

function makeCommunityTheme(id: string, label: string, pkg: string): ThemeDef {
  return {
    id,
    label,
    contentType: 'text/html',
    filenameExt: '.html',
    render: async (cv): Promise<ThemeRenderResult> => {
      const warnings: LoadWarning[] = [];
      const resume = specCvToJsonResume(cv);
      const mod = await loadCommunityTheme(pkg);
      if (!mod) {
        warnings.push({
          file: pkg, category: 'render-mapping',
          message: `community theme package "${pkg}" not loadable`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
      try {
        const html = await mod.render(resume);
        return { bytes: new TextEncoder().encode(html), warnings };
      } catch (err) {
        warnings.push({
          file: pkg, category: 'render-mapping',
          message: `community theme "${id}" render threw: ${(err as Error).message}`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
    },
  };
}

export const communityThemes: ThemeDef[] = [
  makeCommunityTheme('elegant', 'Elegant', 'jsonresume-theme-elegant'),
  makeCommunityTheme('kendall', 'Kendall', 'jsonresume-theme-kendall'),
  makeCommunityTheme('flat', 'Flat', 'jsonresume-theme-flat'),
  makeCommunityTheme('stackoverflow', 'Stack Overflow', 'jsonresume-theme-stackoverflow'),
];
