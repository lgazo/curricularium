import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverVariants } from '../../src/loader/discover.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLISH = join(here, '..', 'fixtures', 'discover');

describe('discoverVariants', () => {
  it('returns variants in sorted name order', async () => {
    const vs = await discoverVariants(PUBLISH);
    expect(vs.map((v) => v.name)).toEqual(['founder-cto', 'vp-eng']);
    expect(vs[0]!.title).toBe('Founder-CTO');
  });

  it('ignores non-variant subfolders like _schema', async () => {
    const vs = await discoverVariants(PUBLISH);
    expect(vs.find((v) => v.name === '_schema')).toBeUndefined();
  });

  it('returns absolute paths', async () => {
    const vs = await discoverVariants(PUBLISH);
    for (const v of vs) expect(v.path.startsWith('/')).toBe(true);
  });
});
