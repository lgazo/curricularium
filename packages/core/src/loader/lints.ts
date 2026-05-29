import type { LoadWarning, SpecCV } from '../spec/model.js';

const ACTION_VERB_LEAD = /^(co-?led|co-?founded|co-?authored|co-?built|co-?designed|co-?developed|co-?organised|co-?organized|led|shipped|architected|scaled|integrated|founded|rebuilt|delivered|built|drove|launched|grew|owned|managed|reduced|increased|created|migrated|negotiated|recruited|hired|established|introduced|coached|partnered|championed|orchestrated|landed|coordinated|standardised|standardized|designed|developed|mentored|organised|organized|wrote|authored|spoke|presented|taught|guided|implemented|engineered|prototyped|spearheaded|expanded|raised|grew|conducted|invented|pioneered|defined|directed|supervised|oversaw|advised|consulted|published|reviewed|debugged|optimised|optimized|refactored|automated|deployed|maintained|administered|configured|operated|secured|tested|validated|trained|onboarded|facilitated|negotiated)\b/i;

const ACRONYM_RE = /\b[A-Z]{2,6}\b/g;
// Universal acronyms that don't need first-use intro per SPEC §7.10
const COMMON_ACRONYMS = new Set([
  'AI', 'ML', 'API', 'CEO', 'CTO', 'COO', 'CFO', 'CMO', 'CISO', 'VP', 'SVP', 'EVP',
  'IT', 'UI', 'UX', 'HR', 'PR', 'PM', 'PO', 'QA', 'IP', 'TV',
  'PDF', 'JSON', 'XML', 'HTML', 'CSS', 'SQL', 'HTTP', 'HTTPS', 'URL', 'URI',
  'OS', 'CPU', 'GPU', 'RAM', 'SSD', 'HDD', 'USB', 'PC', 'PCI', 'CD', 'DVD',
  'EU', 'US', 'USA', 'UK', 'UN', 'EEA', 'NATO', 'GDPR',
  'PHD', 'BSC', 'MSC', 'MBA', 'BA', 'MA',
]);

export function computeLints(cv: SpecCV, bannedStrings: string[]): LoadWarning[] {
  const warnings: LoadWarning[] = [];

  // banned strings (case-insensitive word boundary)
  if (bannedStrings.length > 0) {
    const patterns = bannedStrings.map((p) => new RegExp(`\\b${escapeRegex(p)}\\b`, 'i'));
    for (const atom of allBodiedAtoms(cv)) {
      for (let i = 0; i < patterns.length; i++) {
        if (patterns[i]!.test(atom.body)) {
          warnings.push({
            file: atom.file, category: 'banned-string',
            message: `matches "${bannedStrings[i]}" pattern`,
          });
        }
      }
    }
  }

  // action-verb lead on bullets
  for (const atom of allBodiedAtoms(cv)) {
    const bullets = atom.body.split(/\r?\n/).filter((l) => /^\s*-\s+/.test(l));
    for (let i = 0; i < bullets.length; i++) {
      const text = bullets[i]!.replace(/^\s*-\s+/, '').trim();
      const firstWord = text.split(/\s+/)[0] ?? '';
      if (firstWord && !ACTION_VERB_LEAD.test(text)) {
        warnings.push({
          file: atom.file, category: 'action-verb',
          message: `bullet ${i + 1} starts with "${firstWord}"`,
        });
      }
    }
  }

  // date sanity
  for (const e of cv.workExperience) checkDates(warnings, `work-experience/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.education) checkDates(warnings, `education/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.community) checkDates(warnings, `community/${e.name}`, e.periodStart, e.periodEnd);
  for (const e of cv.openSource) checkDates(warnings, `open-source/${e.name}`, e.periodStart, e.periodEnd);

  // present misuse: only the most recent work-experience may have present
  for (let i = 1; i < cv.workExperience.length; i++) {
    if (cv.workExperience[i]!.periodEnd === 'present') {
      warnings.push({
        file: `work-experience/${cv.workExperience[i]!.name}`,
        category: 'date',
        message: '"present" allowed only on the most recent work-experience',
      });
    }
  }

  // cross-atom: refProjects must resolve
  const projectNames = new Set(cv.projects.map((p) => p.name));
  for (const w of cv.workExperience) {
    for (let i = 0; i < w.refProjects.length; i++) {
      if (!projectNames.has(w.refProjects[i]!)) {
        warnings.push({
          file: `work-experience/${w.name}`, category: 'cross-atom',
          field: `ref-projects[${i}]`,
          message: `"${w.refProjects[i]}" not found in projects`,
        });
      }
    }
  }
  // cross-atom: parentExperience must resolve
  const expNames = new Set(cv.workExperience.map((e) => e.name));
  for (const p of cv.projects) {
    if (p.parentExperience && !expNames.has(p.parentExperience)) {
      warnings.push({
        file: `project/${p.name}`, category: 'cross-atom',
        field: 'parent-experience',
        message: `"${p.parentExperience}" not found in work-experience`,
      });
    }
  }

  // acronym first-use check (document-wide)
  const seenFullTerms = new Set<string>();
  // build full-term map from all bodies first (rough heuristic: "Word Phrase (ACR)" introduces ACR)
  const introduced = new Set<string>();
  for (const atom of allBodiedAtoms(cv)) {
    for (const m of atom.body.matchAll(/\(([A-Z]{2,6})\)/g)) introduced.add(m[1]!);
  }
  for (const atom of allBodiedAtoms(cv)) {
    const acronyms = new Set<string>();
    for (const m of atom.body.matchAll(ACRONYM_RE)) acronyms.add(m[0]);
    for (const acr of acronyms) {
      if (COMMON_ACRONYMS.has(acr)) continue;
      if (!introduced.has(acr) && !seenFullTerms.has(acr)) {
        warnings.push({
          file: atom.file, category: 'acronym',
          message: `"${acr}" appears before full term`,
        });
        seenFullTerms.add(acr);
      }
    }
  }

  return warnings;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type BodiedRef = { file: string; body: string };

function allBodiedAtoms(cv: SpecCV): BodiedRef[] {
  const out: BodiedRef[] = [];
  const add = (type: string, name: string, body: string) => out.push({ file: `${type}/${name}`, body });
  if (cv.personal) add('personal', cv.personal.name, cv.personal.body);
  if (cv.identity.headline) add('identity', 'headline', cv.identity.headline.body);
  if (cv.identity.about) add('identity', 'about', cv.identity.about.body);
  for (const w of cv.workExperience) add('work-experience', w.name, w.body);
  for (const p of cv.projects) add('project', p.name, p.body);
  for (const e of cv.education) add('education', e.name, e.body);
  for (const e of cv.community) add('community', e.name, e.body);
  for (const e of cv.openSource) add('open-source', e.name, e.body);
  for (const e of cv.awards) add('award', e.name, e.body);
  for (const e of cv.publications) add('publication', e.name, e.body);
  if (cv.skills) add('skill', cv.skills.name, cv.skills.body);
  if (cv.languages) add('language', cv.languages.name, cv.languages.body);
  return out;
}

function checkDates(warnings: LoadWarning[], file: string, start: string, end: string | null): void {
  if (end === null || end === 'present') return;
  if (end.localeCompare(start) < 0) {
    warnings.push({ file, category: 'date', message: 'period-end before period-start' });
  }
}
