import type { ThemeDef, ThemeRenderResult } from '../../registry.js';
import { specCvToJsonResume } from '../adapter.js';
import type { LoadWarning } from '../../../spec/model.js';
import { loadPhoto, toDataUri } from '../../../spec/photo.js';
import { discoverThemes, type DiscoveredTheme } from './discover.js';
import { installTheme, isInstalled } from './install.js';
import { loadThemeModule } from './bundle.js';

/**
 * Curated favorites — ordered. Appear at the top of the dropdown regardless of
 * install status. Added even when the npm registry search does not return them
 * (e.g. low-download themes that rank past the search limit).
 */
export const FAVORITE_THEME_IDS: readonly string[] = [
  'stackoverflow',
  'architects-portfolio',
  'macchiato',
  'sidebar',
  'graph-paper-grid',
  'two-column-modernist',
  'even',
];
const FAVORITE_SET = new Set(FAVORITE_THEME_IDS);

function titlecase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ');
}

function makeCommunityTheme(meta: DiscoveredTheme): ThemeDef {
  return {
    id: meta.id,
    label: meta.label,
    contentType: 'text/html',
    filenameExt: '.html',
    pkg: meta.pkg,
    favorite: FAVORITE_SET.has(meta.id),
    render: async (cv): Promise<ThemeRenderResult> => {
      const warnings: LoadWarning[] = [];
      const photo = await loadPhoto(cv.personal?.photo ?? null);
      const photoUrl = photo ? toDataUri(photo) : null;
      const resume = specCvToJsonResume(cv, { photoUrl });
      if (!isInstalled(meta.pkg)) {
        try {
          await installTheme(meta.pkg);
        } catch (err) {
          warnings.push({
            file: meta.pkg,
            category: 'render-mapping',
            message: `auto-install of "${meta.pkg}" failed: ${(err as Error).message}`,
          });
          return { bytes: new Uint8Array(), warnings };
        }
      }
      let mod;
      try {
        mod = await loadThemeModule(meta.pkg);
      } catch (err) {
        warnings.push({
          file: meta.pkg,
          category: 'render-mapping',
          message: `community theme package "${meta.pkg}" not loadable: ${(err as Error).message}`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
      if (!mod) {
        warnings.push({
          file: meta.pkg,
          category: 'render-mapping',
          message: `community theme package "${meta.pkg}" not loadable after install`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
      try {
        const html = await mod.render(resume);
        return { bytes: new TextEncoder().encode(html), warnings };
      } catch (err) {
        warnings.push({
          file: meta.pkg,
          category: 'render-mapping',
          message: `community theme "${meta.id}" render threw: ${(err as Error).message}`,
        });
        return { bytes: new Uint8Array(), warnings };
      }
    },
  };
}

const FALLBACK: DiscoveredTheme[] = [
  { pkg: 'jsonresume-theme-elegant', id: 'elegant', label: 'Elegant', version: '*' },
  { pkg: 'jsonresume-theme-kendall', id: 'kendall', label: 'Kendall', version: '*' },
  { pkg: 'jsonresume-theme-flat', id: 'flat', label: 'Flat', version: '*' },
  { pkg: 'jsonresume-theme-stackoverflow', id: 'stackoverflow', label: 'Stack Overflow', version: '*' },
];

export const fallbackCommunityThemes: ThemeDef[] = FALLBACK.map(makeCommunityTheme);

function ensureFavoritesPresent(list: DiscoveredTheme[]): DiscoveredTheme[] {
  const present = new Set(list.map((t) => t.id));
  const merged = list.slice();
  for (const id of FAVORITE_THEME_IDS) {
    if (present.has(id)) continue;
    const pkg = `jsonresume-theme-${id}`;
    merged.push({ pkg, id, label: titlecase(id), version: '*' });
  }
  return merged;
}

export async function buildCommunityThemes(): Promise<ThemeDef[]> {
  const list = ensureFavoritesPresent(await discoverThemes());
  return list.map(makeCommunityTheme);
}
