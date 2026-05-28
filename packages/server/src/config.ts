import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';

export const SourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  addedAt: z.string(),
});

export const ConfigSchema = z.object({
  sources: z.array(SourceSchema).default([]),
  activeSourceId: z.string().nullable().default(null),
});

export type Source = z.infer<typeof SourceSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export function configFilePath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.config');
  return join(base, 'curricularium', 'config.json');
}

export async function loadConfig(): Promise<Config> {
  const path = configFilePath();
  if (!existsSync(path)) return { sources: [], activeSourceId: null };
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { sources: [], activeSourceId: null };
  }
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) return { sources: [], activeSourceId: null };
  return result.data;
}

export async function saveConfig(config: Config): Promise<void> {
  const path = configFilePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
