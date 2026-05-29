import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVariant } from '../../src/loader/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, '..', 'fixtures', 'variants');

describe('loadVariant', () => {
  it('loads the minimal fixture and reports ok with warnings', async () => {
    const r = await loadVariant(join(FIX, 'minimal'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cv.variant.name).toBe('minimal');
    expect(r.cv.personal?.fullName).toBe('Jane Doe');
    expect(r.cv.identity.about?.body).toContain('Senior Engineer');
    expect(r.cv.workExperience).toHaveLength(1);
    expect(r.cv.workExperience[0]!.employer).toBe('Foo Inc');
    // fixture intentionally trips two lints
    expect(r.warnings.some((w) => w.category === 'action-verb')).toBe(true);
    expect(r.warnings.some((w) => w.category === 'acronym')).toBe(true);
  });

  it('returns ok:false when variant.md is missing', async () => {
    const r = await loadVariant(join(FIX, 'missing'));
    expect(r.ok).toBe(false);
  });
});
