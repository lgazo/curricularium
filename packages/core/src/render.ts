import './outputs/index.js';  // ensure registry side-effects
import type { LoadWarning, SpecCV } from './spec/model.js';
import { findOutput, findTheme } from './outputs/registry.js';

export type RenderArgs = {
  cv: SpecCV;
  outputId: string;
  themeId: string;
  opts?: unknown;
};

export type RenderResult = {
  contentType: string;
  filename: string;
  bytes: Uint8Array;
  warnings: LoadWarning[];
};

export class UnknownOutput extends Error {
  constructor(id: string) { super(`UnknownOutput: ${id}`); }
}
export class UnknownTheme extends Error {
  constructor(outputId: string, themeId: string) { super(`UnknownTheme: ${outputId}/${themeId}`); }
}

export async function render(args: RenderArgs): Promise<RenderResult> {
  const output = findOutput(args.outputId);
  if (!output) throw new UnknownOutput(args.outputId);
  const theme = findTheme(args.outputId, args.themeId);
  if (!theme) throw new UnknownTheme(args.outputId, args.themeId);

  const { bytes, warnings } = await theme.render(args.cv, args.opts);
  const includeTheme = theme.id !== output.defaultThemeId;
  const suffix = includeTheme ? `-${theme.id}` : '';
  const filename = `${args.cv.variant.name}-${output.id}${suffix}${theme.filenameExt}`;
  return { contentType: theme.contentType, filename, bytes, warnings };
}
