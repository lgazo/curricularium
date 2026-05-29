import type { SectionType } from './model.js';

export const DEFAULT_SECTION_ORDER: SectionType[] = [
  'personal',
  'identity',
  'work-experience',
  'project',
  'skill',
  'education',
  'community',
  'open-source',
  'award',
  'publication',
  'language',
];

export const SECTION_HEADINGS: Record<SectionType, string> = {
  'personal': 'Personal Information',
  'identity': 'Professional Summary',
  'work-experience': 'Work Experience',
  'project': 'Projects',
  'skill': 'Skills',
  'education': 'Education',
  'community': 'Volunteering',
  'open-source': 'Open Source',
  'award': 'Awards and Achievements',
  'publication': 'Publications',
  'language': 'Languages',
};

export function summaryHeading(mode: 'summary' | 'objective'): string {
  return mode === 'objective' ? 'Objective' : 'Professional Summary';
}

export type DateLike = string;  // narrowed in model.ts; canonical accepts any of YYYY-MM, YYYY, "present"

export function formatDateMMYYYY(d: DateLike): string {
  if (d === 'present') return 'Present';
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return `${m[2]}/${m[1]}`;
  return d;  // bare YYYY
}

export function formatDateISO(d: DateLike): string | null {
  if (d === 'present') return null;
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return `${m[1]}-${m[2]}-01`;
  if (/^\d{4}$/.test(d)) return `${d}-01-01`;
  return null;
}

export type EuropassDate =
  | { year: string; month?: string }
  | { current: true };

export function formatDateEuropass(d: DateLike): EuropassDate {
  if (d === 'present') return { current: true };
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return { year: m[1]!, month: `--${m[2]}` };
  if (/^\d{4}$/.test(d)) return { year: d };
  return { year: d };
}
