import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';

export type VariantSummary = { name: string; title: string; path: string };

export async function discoverVariants(publishRoot: string): Promise<VariantSummary[]> {
  const root = resolve(publishRoot);
  if (!existsSync(root)) return [];

  const entries = await readdir(root);
  const out: VariantSummary[] = [];
  for (const entry of entries) {
    if (entry.startsWith('.') || entry.startsWith('_')) continue;
    const candidate = join(root, entry);
    let s;
    try {
      s = await stat(candidate);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    const manifest = join(candidate, 'variant.md');
    if (!existsSync(manifest)) continue;
    try {
      const raw = await readFile(manifest, 'utf8');
      const fm = matter(raw).data as Record<string, unknown>;
      const name = String(fm['name'] ?? entry);
      const title = String(fm['title'] ?? entry);
      out.push({ name, title, path: candidate });
    } catch {
      continue;
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
