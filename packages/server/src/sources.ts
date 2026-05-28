import { existsSync, statSync, accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { ulid } from 'ulid';
import { loadConfig, saveConfig, type Config, type Source } from './config.js';

export type AddSourceInput = { name: string; path: string };
export type AddSourceResult =
  | { ok: true; source: Source; config: Config }
  | { ok: false; message: string };

function validateSourcePath(path: string): string | null {
  if (!existsSync(path)) return 'path does not exist';
  let stats;
  try {
    stats = statSync(path);
  } catch (err) {
    return `cannot stat path: ${(err as Error).message}`;
  }
  if (!stats.isDirectory()) return 'path is not a directory';
  try {
    accessSync(path, constants.R_OK);
  } catch {
    return 'path is not readable';
  }
  if (!existsSync(join(path, 'profile.md'))) return 'directory is missing profile.md';
  return null;
}

export async function addSource(input: AddSourceInput): Promise<AddSourceResult> {
  const name = input.name.trim();
  const path = input.path.trim();
  if (!name) return { ok: false, message: 'name is required' };
  if (!path) return { ok: false, message: 'path is required' };
  const error = validateSourcePath(path);
  if (error) return { ok: false, message: error };

  const config = await loadConfig();
  const source: Source = {
    id: ulid(),
    name,
    path,
    addedAt: new Date().toISOString(),
  };
  const next: Config = {
    sources: [...config.sources, source],
    activeSourceId: config.activeSourceId ?? source.id,
  };
  await saveConfig(next);
  return { ok: true, source, config: next };
}

export async function removeSource(id: string): Promise<Config> {
  const config = await loadConfig();
  const sources = config.sources.filter((s) => s.id !== id);
  const activeSourceId =
    config.activeSourceId === id ? (sources[0]?.id ?? null) : config.activeSourceId;
  const next: Config = { sources, activeSourceId };
  await saveConfig(next);
  return next;
}

export async function activateSource(id: string): Promise<Config> {
  const config = await loadConfig();
  if (!config.sources.some((s) => s.id === id)) return config;
  const next: Config = { ...config, activeSourceId: id };
  await saveConfig(next);
  return next;
}

export async function getActiveSource(): Promise<Source | null> {
  const config = await loadConfig();
  if (!config.activeSourceId) return null;
  return config.sources.find((s) => s.id === config.activeSourceId) ?? null;
}

export function sourceAvailability(source: Source): 'ok' | 'missing' | 'unreadable' {
  if (!existsSync(source.path)) return 'missing';
  try {
    accessSync(source.path, constants.R_OK);
  } catch {
    return 'unreadable';
  }
  return 'ok';
}
