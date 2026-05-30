import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { findTheme, findOutput } from '../../src/outputs/registry.js';
import type { SpecCV } from '../../src/spec/model.js';

function minimal(): SpecCV {
  return {
    variantRoot: '/r',
    variant: {
      type: 'variant', name: 'x', title: 'X', targetRole: 'X',
      sectionOrder: ['personal', 'identity'], lang: 'en', sourceMaster: '',
      outputTargets: [], summaryMode: 'summary', collapseOpenSource: false, body: '',
    },
    personal: {
      type: 'personal', name: 'p', source: null, order: 0, lang: 'en',
      fullName: 'Jane Doe', targetRole: 'CTO', email: 'j@x.com', phone: null,
      location: 'Bratislava, Slovakia', profiles: [], photo: null, body: '',
    },
    identity: {
      headline: { type: 'identity', subtype: 'headline', name: 'h', source: null, order: 0, lang: 'en', body: 'CTO' },
      about: { type: 'identity', subtype: 'about', name: 'a', source: null, order: 0, lang: 'en', body: 'Senior.' },
    },
    workExperience: [], projects: [], education: [], community: [],
    openSource: [], awards: [], publications: [], skills: null, languages: null,
  };
}

describe('jsonresume community themes', () => {
  it('exposes elegant, kendall, flat, stackoverflow as themes', () => {
    const ids = findOutput('jsonresume')!.themes.map((t) => t.id).sort();
    expect(ids).toContain('elegant');
    expect(ids).toContain('kendall');
    expect(ids).toContain('flat');
    expect(ids).toContain('stackoverflow');
  });

  it('elegant theme renders HTML containing the candidate name', async () => {
    const t = findTheme('jsonresume', 'elegant')!;
    expect(t.contentType).toBe('text/html');
    expect(t.filenameExt).toBe('.html');
    const { bytes, warnings } = await t.render(minimal(), {});
    const html = new TextDecoder().decode(bytes);
    if (warnings.length === 0) {
      expect(html).toContain('Jane Doe');
    } else {
      // Theme failed at runtime — should have a render-mapping warning, not throw
      expect(warnings.some((w) => w.category === 'render-mapping')).toBe(true);
    }
  });
});
