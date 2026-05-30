import '../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVariant, render } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, 'fixtures', 'variants', 'minimal');

describe('render entry', () => {
  it('renders the minimal fixture as JSON Resume raw', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    const r = await render({ cv: lr.cv, outputId: 'jsonresume', themeId: 'raw' });
    expect(r.contentType).toBe('application/json');
    expect(r.filename).toBe('minimal-jsonresume.json');
    const json = JSON.parse(new TextDecoder().decode(r.bytes));
    expect(json.basics.name).toBe('Jane Doe');
  });

  it('renders the minimal fixture as Europass canonical XML', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    const r = await render({ cv: lr.cv, outputId: 'europass', themeId: 'canonical' });
    expect(r.contentType).toBe('application/xml');
    expect(r.filename).toBe('minimal-europass-canonical.xml');
    expect(new TextDecoder().decode(r.bytes)).toContain('<SkillsPassport');
  });

  it('appends -theme suffix when output has multiple themes', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    const r = await render({ cv: lr.cv, outputId: 'jsonresume', themeId: 'elegant' });
    expect(r.filename).toBe('minimal-jsonresume-elegant.html');
  });

  it('throws UnknownOutput for an unknown outputId', async () => {
    const lr = await loadVariant(FIX);
    if (!lr.ok) throw new Error('load failed');
    await expect(render({ cv: lr.cv, outputId: 'nope', themeId: 'x' })).rejects.toThrow(/UnknownOutput/);
  });
});
