import { mkdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const CACHE_DIR = join(homedir(), '.cache', 'curricularium', 'themes-build');
const require_ = createRequire(import.meta.url);

type CommunityThemeModule = {
  render: (resume: unknown) => string | Promise<string>;
};

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readPkgVersion(pkg: string): Promise<string> {
  try {
    const pjPath = require_.resolve(`${pkg}/package.json`);
    const txt = await readFile(pjPath, 'utf-8');
    const v = (JSON.parse(txt) as { version?: string }).version;
    return typeof v === 'string' ? v : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function buildThemeBundle(pkg: string, version: string): Promise<string> {
  const safeName = pkg.replace(/[@/]/g, '_');
  const outFile = join(CACHE_DIR, `${safeName}@${version}.mjs`);
  if (await exists(outFile)) return outFile;

  await mkdir(CACHE_DIR, { recursive: true });

  // Resolve the theme's entry point through Node's normal resolution so we
  // pick up whatever the package's `main`/`exports` declare.
  const entry = require_.resolve(pkg);

  await esbuild.build({
    entryPoints: [entry],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    loader: { '.js': 'jsx', '.jsx': 'jsx', '.css': 'text' },
    // `automatic` makes esbuild inject `react/jsx-runtime` imports per file, so
    // themes whose helper JSX files don't `import React` still work. Classic
    // transform would require React in scope in every JSX file.
    jsx: 'automatic',
    logLevel: 'silent',
    // Resolve everything from the theme's location, not ours.
    absWorkingDir: dirname(entry),
    // Prefer ESM entry points so default-export semantics line up with the
    // bundled output format. Falls back to `main` for CJS-only packages.
    mainFields: ['module', 'main'],
    conditions: ['module', 'import', 'default'],
    // Bundle deps too — the cached file becomes self-contained.
    external: [],
    // Themes pull in CJS deps that internally call `require('util')` etc.
    // Provide a CJS-style `require` inside the ESM output so those calls work.
    banner: {
      js:
        "import { createRequire as __cur_createRequire__ } from 'node:module';" +
        "const require = __cur_createRequire__(import.meta.url);",
    },
  });
  return outFile;
}

function pickRender(mod: Record<string, unknown>): CommunityThemeModule | null {
  if (typeof mod.render === 'function') return mod as unknown as CommunityThemeModule;
  const def = mod.default as Record<string, unknown> | undefined;
  if (def && typeof def.render === 'function') return def as unknown as CommunityThemeModule;
  return null;
}

/**
 * Loads a JSON Resume community theme. First tries Node's native import; on any
 * failure (typically `Unexpected token '<'` for themes shipping raw JSX in .js
 * files like graph-paper-grid/sidebar) falls back to bundling the theme with
 * esbuild and importing the cached output.
 */
export class ThemeLoadError extends Error {
  constructor(public readonly pkg: string, message: string) {
    super(message);
  }
}

export async function loadThemeModule(pkg: string): Promise<CommunityThemeModule | null> {
  let nativeErr: Error | null = null;
  try {
    const mod = await import(pkg);
    const picked = pickRender(mod as Record<string, unknown>);
    if (picked) return picked;
  } catch (err) {
    nativeErr = err as Error;
  }

  try {
    const version = await readPkgVersion(pkg);
    const bundled = await buildThemeBundle(pkg, version);
    const mod = await import(pathToFileURL(bundled).href);
    const picked = pickRender(mod as Record<string, unknown>);
    if (picked) return picked;
    throw new ThemeLoadError(pkg, 'bundled module did not expose render()');
  } catch (err) {
    const bundleMsg = (err as Error).message;
    const nativeMsg = nativeErr?.message ?? '(no native error)';
    throw new ThemeLoadError(
      pkg,
      `native load: ${nativeMsg}; bundle load: ${bundleMsg}`,
    );
  }
}
