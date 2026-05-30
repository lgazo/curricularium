import { findOutput } from '../registry.js';
import { buildCommunityThemes } from './themes/community.js';

let _initialized: Promise<void> | null = null;

export function initJsonResumeThemes(): Promise<void> {
  if (_initialized) return _initialized;
  _initialized = (async () => {
    const themes = await buildCommunityThemes();
    const out = findOutput('jsonresume');
    if (!out) return;
    const existingIds = new Set(out.themes.map((t) => t.id));
    for (const t of themes) {
      if (!existingIds.has(t.id)) out.themes.push(t);
    }
  })();
  return _initialized;
}
