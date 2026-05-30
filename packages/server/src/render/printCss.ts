import type { PrintConfig } from '../config.js';

function escapeCssText(value: string): string {
  return value.replace(/<\/style/gi, '<\\/style');
}

function splitSelectors(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function joinSelectors(selectors: string[]): string {
  return selectors.join(', ');
}

type PageDims = { wMm: number; hMm: number };

const PAGE_DIMS: Record<PrintConfig['pageSize'], PageDims> = {
  A3: { wMm: 297, hMm: 420 },
  A4: { wMm: 210, hMm: 297 },
  A5: { wMm: 148, hMm: 210 },
  Letter: { wMm: 215.9, hMm: 279.4 },
  Legal: { wMm: 215.9, hMm: 355.6 },
};

export function buildPrintCss(
  cfg: PrintConfig,
  opts?: { mode?: 'print' | 'screen' },
): string {
  if (!cfg.enabled) return '';
  const mode = opts?.mode ?? 'print';
  const rules: string[] = [];

  if (mode === 'print') {
    rules.push(`@page { size: ${cfg.pageSize}; margin: ${cfg.marginMm}mm; }`);
  }

  const tuningRules: string[] = [];

  if (cfg.bodyFontPx > 0) {
    tuningRules.push(`html, body { font-size: ${cfg.bodyFontPx}px; }`);
  }
  if (cfg.bodyPaddingMm > 0) {
    tuningRules.push(`body { padding: ${cfg.bodyPaddingMm}mm; }`);
  }
  if (cfg.headingScalePct !== 100) {
    const f = cfg.headingScalePct / 100;
    tuningRules.push(
      `h1 { font-size: ${(2.0 * f).toFixed(3)}em; } h2 { font-size: ${(1.5 * f).toFixed(3)}em; } h3 { font-size: ${(1.25 * f).toFixed(3)}em; } h4 { font-size: ${(1.1 * f).toFixed(3)}em; }`,
    );
  }

  if (cfg.useEntryGrouping) {
    const entrySelectors: string[] = [];
    entrySelectors.push(...splitSelectors(cfg.semanticEntrySelectors));
    const headingSels = splitSelectors(cfg.entryHeadingSelectors);
    if (cfg.useDirectHeadingEntries) {
      for (const h of headingSels) entrySelectors.push(`*:has(> ${h}:first-child)`);
    }
    if (cfg.useNestedHeadingEntries) {
      for (const h of headingSels) entrySelectors.push(`*:has(> *:first-child > ${h}:first-child)`);
    }
    if (entrySelectors.length > 0) {
      tuningRules.push(
        `${joinSelectors(entrySelectors)} { break-inside: avoid; page-break-inside: avoid; }`,
      );
    }
  }

  if (cfg.keepHeadingsWithContent) {
    const sels = splitSelectors(cfg.headingSelectors);
    if (sels.length > 0) {
      tuningRules.push(
        `${joinSelectors(sels)} { break-after: avoid; page-break-after: avoid; }`,
      );
      if (cfg.keepHeadingNextBlock) {
        const siblings = sels.map((s) => `${s} + *`);
        tuningRules.push(
          `${joinSelectors(siblings)} { break-before: avoid; page-break-before: avoid; }`,
        );
      }
    }
  }

  tuningRules.push(`p { orphans: ${cfg.orphans}; widows: ${cfg.widows}; }`);

  if (cfg.forcePageBreakBeforeTopSections) {
    const sels = splitSelectors(cfg.topSectionSelector);
    if (sels.length > 0) {
      tuningRules.push(
        `${joinSelectors(sels)} { break-before: page; page-break-before: always; }`,
      );
      tuningRules.push(
        `${sels.map((s) => `${s}:first-of-type`).join(', ')} { break-before: avoid; page-break-before: avoid; }`,
      );
    }
  }

  if (cfg.printBackgrounds) {
    tuningRules.push(
      `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`,
    );
  }

  if (cfg.hideLinkUrls) {
    tuningRules.push(`a[href]:after { content: "" !important; }`);
  }

  const extras = splitSelectors(cfg.extraAvoidSelectors);
  if (extras.length > 0) {
    tuningRules.push(
      `${joinSelectors(extras)} { break-inside: avoid; page-break-inside: avoid; }`,
    );
  }

  if (cfg.customCss.trim().length > 0) {
    tuningRules.push(cfg.customCss);
  }

  if (mode === 'print') {
    rules.push(`@media print {\n  ${tuningRules.join('\n  ')}\n}`);
  } else {
    const dims = PAGE_DIMS[cfg.pageSize];
    const contentW = Math.max(0, dims.wMm - 2 * cfg.marginMm);
    const contentH = Math.max(0, dims.hMm - 2 * cfg.marginMm);
    const screenChrome = [
      `html { background: #475569 !important; }`,
      `body {`,
      `  background: white !important;`,
      `  width: ${contentW}mm !important;`,
      `  max-width: ${contentW}mm !important;`,
      `  min-height: ${contentH}mm;`,
      `  margin: 16px auto !important;`,
      `  box-shadow: 0 2px 12px rgba(0,0,0,0.25);`,
      `  outline: 1px solid rgba(0,0,0,0.15);`,
      `}`,
    ].join('\n');
    rules.push(screenChrome);
    rules.push(tuningRules.join('\n'));
  }

  return `<style data-curricularium-print="1">\n${escapeCssText(rules.join('\n'))}\n</style>`;
}

export function unwrapPrintMedia(css: string): string {
  return css.replace(/@media\s+print\b/gi, '@media all');
}
