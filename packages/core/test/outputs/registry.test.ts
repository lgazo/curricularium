import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { registry, listOutputs, findTheme } from '../../src/outputs/registry.js';

describe('output registry', () => {
  it('exposes html, jsonresume, europass outputs', () => {
    const ids = listOutputs().map((o) => o.id).sort();
    expect(ids).toEqual(['europass', 'html', 'jsonresume']);
  });

  it('each output has at least one theme and a default', () => {
    for (const o of listOutputs()) {
      expect(o.themes.length).toBeGreaterThan(0);
      expect(o.themes.some((t) => t.id === o.defaultThemeId)).toBe(true);
    }
  });

  it('findTheme returns the theme by output + theme id', () => {
    const t = findTheme('jsonresume', 'raw');
    expect(t?.id).toBe('raw');
    expect(t?.contentType).toBe('application/json');
  });

  it('findTheme returns undefined for unknown ids', () => {
    expect(findTheme('nope', 'raw')).toBeUndefined();
    expect(findTheme('jsonresume', 'nope')).toBeUndefined();
  });
});
