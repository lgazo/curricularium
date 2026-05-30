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

export function buildPrintCss(cfg: PrintConfig): string {
  if (!cfg.enabled) return '';
  const rules: string[] = [];

  rules.push(`@page { size: ${cfg.pageSize}; margin: ${cfg.marginMm}mm; }`);

  const mediaRules: string[] = [];

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
      mediaRules.push(
        `${joinSelectors(entrySelectors)} { break-inside: avoid; page-break-inside: avoid; }`,
      );
    }
  }

  if (cfg.keepHeadingsWithContent) {
    const sels = splitSelectors(cfg.headingSelectors);
    if (sels.length > 0) {
      mediaRules.push(
        `${joinSelectors(sels)} { break-after: avoid; page-break-after: avoid; }`,
      );
      if (cfg.keepHeadingNextBlock) {
        const siblings = sels.map((s) => `${s} + *`);
        mediaRules.push(
          `${joinSelectors(siblings)} { break-before: avoid; page-break-before: avoid; }`,
        );
      }
    }
  }

  mediaRules.push(`p { orphans: ${cfg.orphans}; widows: ${cfg.widows}; }`);

  if (cfg.forcePageBreakBeforeTopSections) {
    const sels = splitSelectors(cfg.topSectionSelector);
    if (sels.length > 0) {
      mediaRules.push(
        `${joinSelectors(sels)} { break-before: page; page-break-before: always; }`,
      );
      mediaRules.push(
        `${sels.map((s) => `${s}:first-of-type`).join(', ')} { break-before: avoid; page-break-before: avoid; }`,
      );
    }
  }

  if (cfg.printBackgrounds) {
    mediaRules.push(
      `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`,
    );
  }

  if (cfg.hideLinkUrls) {
    mediaRules.push(`a[href]:after { content: "" !important; }`);
  }

  const extras = splitSelectors(cfg.extraAvoidSelectors);
  if (extras.length > 0) {
    mediaRules.push(
      `${joinSelectors(extras)} { break-inside: avoid; page-break-inside: avoid; }`,
    );
  }

  rules.push(`@media print {\n  ${mediaRules.join('\n  ')}\n}`);

  if (cfg.customCss.trim().length > 0) {
    rules.push(cfg.customCss);
  }

  return `<style data-curricularium-print="1">\n${escapeCssText(rules.join('\n'))}\n</style>`;
}
