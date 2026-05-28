import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const src = resolve(pkgRoot, 'node_modules/htmx.org/dist/htmx.min.js');
const dest = resolve(pkgRoot, 'src/static/htmx.min.js');

await mkdir(dirname(dest), { recursive: true });
await cp(src, dest);
console.log(`Vendored htmx.min.js → ${dest}`);
