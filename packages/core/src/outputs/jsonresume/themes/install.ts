import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(import.meta.url);
// here = packages/core/src/outputs/jsonresume/themes/install.ts
// core root: packages/core
const CORE_ROOT = resolve(here, '../../../../..');

const require_ = createRequire(import.meta.url);

export function isInstalled(pkg: string): boolean {
  try {
    require_.resolve(pkg);
    return true;
  } catch {
    return false;
  }
}

const _installing = new Map<string, Promise<void>>();

/**
 * Strict allowlist for theme package names. Blocks shell metacharacters,
 * leading `-` (would be interpreted as a pnpm flag), URL-like values, etc.
 * Accepts: `jsonresume-theme-<slug>` or `@<scope>/jsonresume-theme-<slug>`.
 */
const SAFE_PKG_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?jsonresume-theme-[a-z0-9][a-z0-9-]*$/;

export function installTheme(pkg: string): Promise<void> {
  if (!SAFE_PKG_RE.test(pkg)) {
    return Promise.reject(new Error(`refusing to install untrusted theme name: ${JSON.stringify(pkg)}`));
  }
  const existing = _installing.get(pkg);
  if (existing) return existing;
  const p = new Promise<void>((res, rej) => {
    // `--` terminates flag parsing so `pkg` cannot be re-interpreted as a flag
    // even if the allowlist is bypassed in the future.
    const child = spawn('pnpm', ['add', '--ignore-scripts', '--', pkg], {
      cwd: CORE_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1' },
    });
    let buf = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
    });
    child.on('error', rej);
    child.on('close', (code) => {
      if (code === 0) res();
      else {
        const msg = buf.replace(/\s+/g, ' ').trim().slice(-600) || '(no output captured)';
        rej(new Error(`pnpm add ${pkg} exited ${code}: ${msg}`));
      }
    });
  });
  _installing.set(pkg, p);
  p.finally(() => _installing.delete(pkg)).catch(() => undefined);
  return p;
}
