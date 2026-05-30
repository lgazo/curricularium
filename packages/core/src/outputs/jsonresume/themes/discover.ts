import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CACHE_DIR = join(homedir(), '.cache', 'curricularium');
const CACHE_FILE = join(CACHE_DIR, 'jsonresume-themes.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NPM_SEARCH_URL =
  'https://registry.npmjs.org/-/v1/search?text=keywords:jsonresume-theme&size=250';

export type DiscoveredTheme = {
  pkg: string;
  id: string;
  label: string;
  version: string;
};

type CacheRecord = { fetchedAt: number; themes: DiscoveredTheme[] };

const FALLBACK: DiscoveredTheme[] = [
  { pkg: 'jsonresume-theme-elegant', id: 'elegant', label: 'Elegant', version: '*' },
  { pkg: 'jsonresume-theme-kendall', id: 'kendall', label: 'Kendall', version: '*' },
  { pkg: 'jsonresume-theme-flat', id: 'flat', label: 'Flat', version: '*' },
  { pkg: 'jsonresume-theme-stackoverflow', id: 'stackoverflow', label: 'Stack Overflow', version: '*' },
];

async function readCache(): Promise<CacheRecord | null> {
  try {
    const txt = await readFile(CACHE_FILE, 'utf-8');
    const data = JSON.parse(txt) as CacheRecord;
    if (!data || typeof data.fetchedAt !== 'number' || !Array.isArray(data.themes)) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeCache(themes: DiscoveredTheme[]): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const rec: CacheRecord = { fetchedAt: Date.now(), themes };
  await writeFile(CACHE_FILE, JSON.stringify(rec, null, 2), 'utf-8');
}

function titlecase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ');
}

type NpmSearchHit = { package: { name: string; version: string } };

async function fetchFromNpm(): Promise<DiscoveredTheme[] | null> {
  try {
    const res = await fetch(NPM_SEARCH_URL);
    if (!res.ok) return null;
    const json = (await res.json()) as { objects: NpmSearchHit[] };
    const themes: DiscoveredTheme[] = [];
    const seen = new Set<string>();
    for (const obj of json.objects) {
      const name = obj.package.name;
      if (!name.startsWith('jsonresume-theme-')) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      const id = name.slice('jsonresume-theme-'.length);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) continue;
      themes.push({ pkg: name, id, label: titlecase(id), version: obj.package.version });
    }
    themes.sort((a, b) => a.label.localeCompare(b.label));
    return themes;
  } catch {
    return null;
  }
}

let _memo: Promise<DiscoveredTheme[]> | null = null;

export function discoverThemes(opts?: { force?: boolean }): Promise<DiscoveredTheme[]> {
  if (opts?.force) _memo = null;
  if (_memo) return _memo;
  _memo = (async () => {
    const cached = await readCache();
    const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
    if (fresh && !opts?.force) return cached.themes;
    const fetched = await fetchFromNpm();
    if (fetched && fetched.length > 0) {
      await writeCache(fetched).catch(() => undefined);
      return fetched;
    }
    if (cached) return cached.themes;
    return FALLBACK;
  })();
  return _memo;
}
