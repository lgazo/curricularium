import type { LoadWarning, SpecCV } from '../spec/model.js';

export type ThemeRenderResult = { bytes: Uint8Array; warnings: LoadWarning[] };

export type ThemeDef = {
  id: string;
  label: string;
  contentType: string;
  filenameExt: string;
  /** npm package name when theme is loaded dynamically; absent for built-in themes. */
  pkg?: string;
  /** True when the theme is part of the curated favorites set. */
  favorite?: boolean;
  render: (cv: SpecCV, opts: unknown) => Promise<ThemeRenderResult>;
};

export type OutputDef = {
  id: string;
  label: string;
  autoWriteOnRender: boolean;
  themes: ThemeDef[];
  defaultThemeId: string;
};

const _registry: OutputDef[] = [];

export function registerOutput(def: OutputDef): void {
  if (_registry.some((o) => o.id === def.id)) {
    throw new Error(`output already registered: ${def.id}`);
  }
  _registry.push(def);
}

export function listOutputs(): OutputDef[] {
  return [..._registry];
}

export function findOutput(id: string): OutputDef | undefined {
  return _registry.find((o) => o.id === id);
}

export function findTheme(outputId: string, themeId: string): ThemeDef | undefined {
  return findOutput(outputId)?.themes.find((t) => t.id === themeId);
}

export const registry = { listOutputs, findOutput, findTheme, registerOutput };
