#!/usr/bin/env -S npx tsx
/**
 * Validate publish/<variant>/ atoms against the CV publish spec.
 *
 * Usage:
 *   npx tsx publish/_tools/validate.ts publish/founder-cto/
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = resolve(HERE, "..", "_schema");
const TOOLS_DIR = HERE;

const ACRONYM_WHITELIST = new Set([
  // tech / generic
  "AI", "ML", "API", "URL", "PDF", "CV", "EU", "UK", "US", "IT", "BE",
  // executive titles
  "CTO", "CEO", "COO", "CFO", "CIO", "CMO", "CHRO",
  "VP", "SVP", "EVP",
  // common CV business jargon
  "P&L", "B2B", "B2C", "SaaS", "ARR", "MRR", "HR",
  // common business / SaaS acronyms
  "STU", "FIIT", "JCI", "EY",
  // recurring co-name acronyms
  "SAP", "SAF", "NN", "HB", "DPD", "GDG", "JUG",
  // languages / standards
  "JSON", "YAML", "XML", "DOI", "CEFR", "ISO",
]);

function loadSchemas(ajv: Ajv2020): Map<string, object> {
  const byType = new Map<string, object>();
  for (const name of readdirSync(SCHEMA_DIR)) {
    if (!name.endsWith(".schema.json")) continue;
    const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, name), "utf8"));
    ajv.addSchema(schema, name);
    const m = name.match(/^(.+)\.schema\.json$/);
    if (m && m[1] !== "atom") byType.set(m[1], schema);
  }
  return byType;
}

function splitFrontmatter(text: string): { fm: Record<string, unknown>; body: string } {
  if (!text.startsWith("---\n")) throw new Error("missing frontmatter");
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("unterminated frontmatter");
  const fm = (yaml.load(text.slice(4, end)) ?? {}) as Record<string, unknown>;
  const body = text.slice(end + 5);
  return { fm, body };
}

function loadLines(filename: string): string[] {
  return readFileSync(join(TOOLS_DIR, filename), "utf8")
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);
}

const BANNED = loadLines("banned-strings.txt").map(s => s.toLowerCase());
const VERBS = new Set(loadLines("action-verbs.txt"));

const H1_RE = /^# /m;
const BULLET_RE = /^- (?:\*\*)?([A-Z][a-z]+(?:-[a-z]+)?)/gm;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const EXPANSION_RE = /([A-Z][A-Za-z\- ]+) \(([A-Z]{2,})\)/g;
const ACRONYM_RE = /(?<![\p{L}])([A-Z]{2,})(?![\p{L}])/gu;

function lintBody(body: string, label: string): string[] {
  const errors: string[] = [];
  const clean = body.replace(COMMENT_RE, "");
  if (H1_RE.test(clean)) errors.push(`${label}: body contains level-1 heading`);
  for (const word of BANNED) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word-boundary on both sides. For tokens that already contain punctuation (e.g. `$`),
    // boundary anchors degrade gracefully because `\b` only asserts at letter/digit transitions.
    const re = new RegExp(`(?:^|\\W)${escaped}(?:\\W|$)`, "i");
    if (re.test(clean)) errors.push(`${label}: banned token in body: "${word}"`);
  }
  for (const m of clean.matchAll(BULLET_RE)) {
    const verb = m[1];
    if (!VERBS.has(verb)) errors.push(`${label}: bullet leads with non-action verb: "${verb}"`);
  }
  return errors;
}

function collectAtoms(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (["_schema", "_tools", "plans", "node_modules"].includes(entry)) continue;
        walk(p);
      } else if (st.isFile() && entry.endsWith(".md") && entry !== "SPEC.md" && entry !== "README.md" && !entry.startsWith(".")) {
        out.push(p);
      }
    }
  };
  walk(root);
  return out.sort();
}

function lintDates(fm: Record<string, unknown>, label: string): string[] {
  const errors: string[] = [];
  const start = fm["period-start"] as string | undefined;
  const end = fm["period-end"] as string | undefined;
  if (start && end && end !== "present") {
    if (end < start) errors.push(`${label}: period-end ${end} precedes period-start ${start}`);
  }
  // 'present' validity is checked at the variant-level, not per atom
  return errors;
}

function findMasterAtomByName(root: string, name: string): string | null {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (!entry.endsWith(".md")) continue;
      try {
        const { fm } = splitFrontmatter(readFileSync(p, "utf8"));
        if (fm.name === name) return p;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function lintSource(fm: Record<string, unknown>, label: string, cwdRoot: string): string[] {
  const src = fm.source;
  if (src === null || src === undefined) return [];
  if (typeof src !== "string") return [`${label}: source must be string or null`];
  const masterRoot = resolve(cwdRoot, "master");
  const exists = statSync(masterRoot, { throwIfNoEntry: false })?.isDirectory();
  if (!exists) return [`${label}: cannot verify source ${JSON.stringify(src)}: master not found at ${masterRoot}`];
  const found = findMasterAtomByName(masterRoot, src);
  if (!found) return [`${label}: source slug ${JSON.stringify(src)} does not match any master atom`];
  return [];
}

function validateAtom(
  path: string,
  ajv: Ajv2020,
  byType: Map<string, object>,
  projectRoot: string,
): string[] {
  const label = relative(process.cwd(), path);
  const text = readFileSync(path, "utf8");
  let fm: Record<string, unknown>;
  let body: string;
  try {
    ({ fm, body } = splitFrontmatter(text));
  } catch (e) {
    return [`${label}: ${(e as Error).message}`];
  }
  const type = fm.type as string | undefined;
  if (!type) return [`${label}: missing type`];
  const schema = byType.get(type);
  if (!schema) return [`${label}: no schema for type=${type}`];
  const validate = ajv.compile(schema);
  const errors: string[] = [];
  if (!validate(fm)) {
    for (const err of validate.errors ?? []) {
      errors.push(`${label}: schema: ${err.message} (at ${err.instancePath || "/"})`);
    }
  }
  errors.push(...lintDates(fm, label));
  errors.push(...lintSource(fm, label, projectRoot));
  errors.push(...lintBody(body, label));
  return errors;
}

function lintPresentMarker(atoms: string[]): string[] {
  const errors: string[] = [];
  const byType = new Map<string, { atom: string; start?: string; end?: string }[]>();
  for (const atom of atoms) {
    try {
      const { fm } = splitFrontmatter(readFileSync(atom, "utf8"));
      const t = fm.type as string;
      if (!["work-experience", "community", "open-source"].includes(t)) continue;
      const entry = { atom, start: fm["period-start"] as string | undefined, end: fm["period-end"] as string | undefined };
      const list = byType.get(t) ?? [];
      list.push(entry);
      byType.set(t, list);
    } catch {
      continue;
    }
  }
  for (const [t, list] of byType) {
    if (t !== "work-experience") continue; // only experience requires single most-recent
    const presentEntries = list.filter(e => e.end === "present");
    if (presentEntries.length > 1) {
      errors.push(`multiple work-experience atoms marked period-end: present — only the most recent may be: ${presentEntries.map(e => e.atom).join(", ")}`);
    }
    if (presentEntries.length === 1) {
      const newest = list.reduce((a, b) => ((a.start ?? "") > (b.start ?? "") ? a : b));
      if (newest.atom !== presentEntries[0].atom) {
        errors.push(`work-experience marked present is not the most recent by period-start: ${presentEntries[0].atom}`);
      }
    }
  }
  return errors;
}

function lintNameUniqueness(atoms: string[]): string[] {
  const byName = new Map<string, string[]>();
  for (const atom of atoms) {
    try {
      const { fm } = splitFrontmatter(readFileSync(atom, "utf8"));
      const name = fm.name as string | undefined;
      if (!name) continue;
      const list = byName.get(name) ?? [];
      list.push(atom);
      byName.set(name, list);
    } catch {
      continue;
    }
  }
  const errors: string[] = [];
  for (const [name, paths] of byName) {
    if (paths.length > 1) {
      errors.push(`duplicate name ${JSON.stringify(name)} across atoms: ${paths.join(", ")}`);
    }
  }
  return errors;
}

function checkAcronyms(atoms: string[]): string[] {
  const expansions = new Set<string>();
  const used = new Set<string>();
  for (const atom of atoms) {
    let body: string;
    try {
      ({ body } = splitFrontmatter(readFileSync(atom, "utf8")));
    } catch {
      continue;
    }
    const clean = body.replace(COMMENT_RE, "");
    for (const m of clean.matchAll(EXPANSION_RE)) expansions.add(m[2]);
    for (const m of clean.matchAll(ACRONYM_RE)) used.add(m[1]);
  }
  const missing = [...used].filter(a => !expansions.has(a) && !ACRONYM_WHITELIST.has(a)).sort();
  if (missing.length > 0) {
    return [`acronyms used without expansion anywhere in the variant: ${JSON.stringify(missing)}`];
  }
  return [];
}

async function main(argv: string[]): Promise<number> {
  if (argv.length !== 3) {
    console.error("usage: validate.ts <variant-folder>");
    return 2;
  }
  const root = resolve(argv[2]);
  try {
    if (!statSync(root).isDirectory()) throw new Error("not a directory");
  } catch {
    console.error(`not a directory: ${root}`);
    return 2;
  }
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const byType = loadSchemas(ajv);
  const atoms = collectAtoms(root);
  // Variant lives at <projectRoot>/publish/<variant>/, so project root is two levels up.
  const projectRoot = resolve(root, "..", "..");
  const errors: string[] = [];
  for (const atom of atoms) errors.push(...validateAtom(atom, ajv, byType, projectRoot));
  errors.push(...checkAcronyms(atoms));
  errors.push(...lintPresentMarker(atoms));
  errors.push(...lintNameUniqueness(atoms));
  if (errors.length > 0) {
    for (const e of errors) console.log(e);
    return 1;
  }
  console.log(`ok: ${atoms.length} atoms valid in ${root}`);
  return 0;
}

main(process.argv).then(code => process.exit(code));
