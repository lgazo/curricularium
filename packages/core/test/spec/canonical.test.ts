import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SECTION_ORDER,
  SECTION_HEADINGS,
  formatDateMMYYYY,
  formatDateISO,
  formatDateEuropass,
} from '../../src/spec/canonical.js';

describe('canonical', () => {
  it('exposes the SPEC.md §7.5 default section order', () => {
    expect(DEFAULT_SECTION_ORDER).toEqual([
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
    ]);
  });

  it('maps section types to SPEC.md §7.4 canonical headings', () => {
    expect(SECTION_HEADINGS['personal']).toBe('Personal Information');
    expect(SECTION_HEADINGS['identity']).toBe('Professional Summary');
    expect(SECTION_HEADINGS['work-experience']).toBe('Work Experience');
    expect(SECTION_HEADINGS['project']).toBe('Projects');
    expect(SECTION_HEADINGS['skill']).toBe('Skills');
    expect(SECTION_HEADINGS['education']).toBe('Education');
    expect(SECTION_HEADINGS['community']).toBe('Volunteering');
    expect(SECTION_HEADINGS['open-source']).toBe('Open Source');
    expect(SECTION_HEADINGS['award']).toBe('Awards and Achievements');
    expect(SECTION_HEADINGS['publication']).toBe('Publications');
    expect(SECTION_HEADINGS['language']).toBe('Languages');
  });

  it('formats YYYY-MM as MM/YYYY per §7.7', () => {
    expect(formatDateMMYYYY('2024-03')).toBe('03/2024');
    expect(formatDateMMYYYY('2024')).toBe('2024');
    expect(formatDateMMYYYY('present')).toBe('Present');
  });

  it('formats dates as YYYY-MM-DD for JSON Resume', () => {
    expect(formatDateISO('2024-03')).toBe('2024-03-01');
    expect(formatDateISO('2024')).toBe('2024-01-01');
    expect(formatDateISO('present')).toBeNull();
  });

  it('formats dates for Europass: Year + Month elements', () => {
    expect(formatDateEuropass('2024-03')).toEqual({ year: '2024', month: '--03' });
    expect(formatDateEuropass('2024')).toEqual({ year: '2024' });
    expect(formatDateEuropass('present')).toEqual({ current: true });
  });
});
