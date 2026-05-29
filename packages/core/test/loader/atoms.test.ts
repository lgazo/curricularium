import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readAtomFile, stripHtmlComments } from '../../src/loader/atoms.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, '..', 'fixtures', 'atoms');

describe('atom reader', () => {
  it('reads a valid work-experience atom and returns frontmatter + body', async () => {
    const a = await readAtomFile(join(FIX, 'work-ok.md'));
    expect(a.frontmatter.type).toBe('work-experience');
    expect(a.frontmatter.name).toBe('nexthink');
    expect(a.frontmatter.visibility).toBe('public');
    expect(a.body).toContain('Led the platform team');
  });

  it('reports visibility=nda atoms as non-public', async () => {
    const a = await readAtomFile(join(FIX, 'work-nda.md'));
    expect(a.frontmatter.visibility).toBe('nda');
  });

  it('strips HTML comments from body', async () => {
    const a = await readAtomFile(join(FIX, 'with-comments.md'));
    const cleaned = stripHtmlComments(a.body);
    expect(cleaned).not.toContain('<!--');
    expect(cleaned).not.toContain('src: master-v02');
    expect(cleaned).toContain('Body kept.');
    expect(cleaned).toContain('Still kept.');
  });

  it('strips block-spanning HTML comments', () => {
    const out = stripHtmlComments('a <!-- multi\nline\ncomment --> b');
    expect(out).toBe('a  b');
  });
});
