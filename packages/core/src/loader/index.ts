import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import type { LoadWarning, SpecCV } from '../spec/model.js';
import { VariantManifestSchema } from '../spec/schemas.js';
import { readAtomFile, type AtomRaw } from './atoms.js';
import { assemble } from './assemble.js';
import { computeLints } from './lints.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bannedStrings: string[] = require('../spec/banned-strings.json') as string[];

export type LoadResult =
  | { ok: true; cv: SpecCV; warnings: LoadWarning[] }
  | { ok: false; errors: LoadWarning[] };

export async function loadVariant(variantRoot: string): Promise<LoadResult> {
  const root = resolve(variantRoot);
  const manifestPath = join(root, 'variant.md');
  if (!existsSync(manifestPath)) {
    return { ok: false, errors: [{ file: manifestPath, category: 'schema', message: 'variant.md not found' }] };
  }

  let variant;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const fm = matter(raw);
    const parsed = VariantManifestSchema.safeParse(fm.data);
    if (!parsed.success) {
      return { ok: false, errors: parsed.error.issues.map((i) => ({
        file: manifestPath, category: 'schema' as const,
        field: i.path.join('.'), message: i.message,
      })) };
    }
    variant = { ...parsed.data, body: fm.content };
  } catch (err) {
    return { ok: false, errors: [{ file: manifestPath, category: 'schema', message: (err as Error).message }] };
  }

  const atoms = await collectAtoms(root);
  const a = assemble(root, variant, atoms);
  const lints = computeLints(a.cv, bannedStrings);
  return { ok: true, cv: a.cv, warnings: [...a.warnings, ...lints] };
}

async function collectAtoms(root: string): Promise<AtomRaw[]> {
  const out: AtomRaw[] = [];
  await walk(root, root, out);
  return out;
}

async function walk(root: string, dir: string, out: AtomRaw[]): Promise<void> {
  const entries = await readdir(dir);
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      await walk(root, full, out);
      continue;
    }
    if (!entry.endsWith('.md')) continue;
    if (full === join(root, 'variant.md')) continue;
    out.push(await readAtomFile(full));
  }
}
