import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';

export const AutoWriteSchema = z.object({
  html: z.boolean().default(true),
  jsonresume: z.boolean().default(false),
  europass: z.boolean().default(false),
}).default({ html: true, jsonresume: false, europass: false });

export const SourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  outputDir: z.string().nullable().default(null),
  autoWrite: AutoWriteSchema,
  bannedStrings: z.array(z.string()).default([]),
  addedAt: z.string(),
});

export const PageSizeSchema = z.enum(['A4', 'A3', 'A5', 'Letter', 'Legal']);

export const PrintConfigSchema = z.object({
  enabled: z.boolean().default(true),
  pageSize: PageSizeSchema.default('A4'),
  marginMm: z.number().min(0).max(50).default(12),
  bodyPaddingMm: z.number().min(0).max(50).default(0),
  bodyFontPx: z.number().min(0).max(48).default(0),
  headingScalePct: z.number().min(50).max(200).default(100),
  useEntryGrouping: z.boolean().default(true),
  semanticEntrySelectors: z.string().default('article, li'),
  useDirectHeadingEntries: z.boolean().default(true),
  useNestedHeadingEntries: z.boolean().default(true),
  entryHeadingSelectors: z.string().default('h3, h4'),
  keepHeadingsWithContent: z.boolean().default(true),
  headingSelectors: z.string().default('h1, h2, h3, h4'),
  keepHeadingNextBlock: z.boolean().default(true),
  orphans: z.number().int().min(1).max(10).default(3),
  widows: z.number().int().min(1).max(10).default(3),
  forcePageBreakBeforeTopSections: z.boolean().default(false),
  topSectionSelector: z.string().default('body > section, main > section'),
  printBackgrounds: z.boolean().default(true),
  hideLinkUrls: z.boolean().default(false),
  extraAvoidSelectors: z.string().default(''),
  customCss: z.string().default(''),
}).default({});

export const ConfigSchema = z.object({
  sources: z.array(SourceSchema).default([]),
  activeSourceId: z.string().nullable().default(null),
  activeVariantName: z.string().nullable().default(null),
  activeOutputId: z.string().nullable().default(null),
  activeThemeId: z.string().nullable().default(null),
  print: PrintConfigSchema,
});

export type Source = z.infer<typeof SourceSchema>;
export type AutoWrite = z.infer<typeof AutoWriteSchema>;
export type PrintConfig = z.infer<typeof PrintConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_PRINT_CONFIG: PrintConfig = PrintConfigSchema.parse({});

export function configFilePath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.config');
  return join(base, 'curricularium', 'config.json');
}

const EMPTY: Config = {
  sources: [], activeSourceId: null, activeVariantName: null,
  activeOutputId: null, activeThemeId: null,
  print: DEFAULT_PRINT_CONFIG,
};

export async function loadConfig(): Promise<Config> {
  const path = configFilePath();
  if (!existsSync(path)) return EMPTY;
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return EMPTY; }
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) return EMPTY;
  return result.data;
}

export async function saveConfig(config: Config): Promise<void> {
  const path = configFilePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function defaultOutputDir(sourcePath: string): string {
  return join(dirname(sourcePath), '_out');
}
