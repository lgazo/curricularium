import { AtomSchemaByType, IdentityAboutSchema, IdentityHeadlineSchema } from '../spec/schemas.js';
import type {
  Award, Community, Education, IdentityAbout, IdentityHeadline, Languages,
  LoadWarning, OpenSource, Personal, Project, Publication, Skills, SpecCV,
  VariantManifest, WorkExperience,
} from '../spec/model.js';
import { stripHtmlComments } from './atoms.js';
import type { AtomRaw } from './atoms.js';

export type AssembleResult = { cv: SpecCV; warnings: LoadWarning[] };

export function assemble(variantRoot: string, variant: VariantManifest, atoms: AtomRaw[]): AssembleResult {
  const warnings: LoadWarning[] = [];

  const cv: SpecCV = {
    variantRoot,
    variant,
    personal: null,
    identity: { headline: null, about: null },
    workExperience: [],
    projects: [],
    education: [],
    community: [],
    openSource: [],
    awards: [],
    publications: [],
    skills: null,
    languages: null,
  };

  for (const atom of atoms) {
    const type = atom.frontmatter['type'];
    const visibility = (atom.frontmatter['visibility'] as string | undefined) ?? 'public';
    if (visibility !== 'public') {
      warnings.push({
        file: atom.path,
        category: 'visibility',
        message: `skipped (visibility=${visibility})`,
      });
      continue;
    }
    const body = stripHtmlComments(atom.body);

    if (type === 'identity') {
      const subtype = atom.frontmatter['subtype'];
      if (subtype === 'headline') {
        const p = IdentityHeadlineSchema.safeParse({ ...atom.frontmatter, body });
        if (!p.success) { addSchemaWarnings(warnings, atom.path, p.error.issues); continue; }
        cv.identity.headline = p.data as unknown as IdentityHeadline;
      } else if (subtype === 'about') {
        const p = IdentityAboutSchema.safeParse({ ...atom.frontmatter, body });
        if (!p.success) { addSchemaWarnings(warnings, atom.path, p.error.issues); continue; }
        cv.identity.about = p.data as unknown as IdentityAbout;
      } else {
        warnings.push({
          file: atom.path, category: 'schema',
          message: `unknown identity subtype: ${String(subtype)}`,
        });
      }
      continue;
    }

    if (typeof type !== 'string' || !(type in AtomSchemaByType)) {
      warnings.push({ file: atom.path, category: 'schema', message: `unknown atom type: ${String(type)}` });
      continue;
    }

    const schema = (AtomSchemaByType as Record<string, { safeParse: (x: unknown) => any }>)[type]!;
    const parsed = schema.safeParse({ ...atom.frontmatter, body });
    if (!parsed.success) {
      addSchemaWarnings(warnings, atom.path, parsed.error.issues);
      continue;
    }
    const v = parsed.data;
    switch (type) {
      case 'work-experience': cv.workExperience.push(v as WorkExperience); break;
      case 'project': cv.projects.push(v as Project); break;
      case 'education': cv.education.push(v as Education); break;
      case 'community': cv.community.push(v as Community); break;
      case 'open-source': cv.openSource.push(v as OpenSource); break;
      case 'award': cv.awards.push(v as Award); break;
      case 'publication': cv.publications.push(v as Publication); break;
      case 'skill':
        if (cv.skills) {
          warnings.push({ file: atom.path, category: 'multi-singleton', message: 'skills.md already loaded' });
        } else cv.skills = v as Skills;
        break;
      case 'language':
        if (cv.languages) {
          warnings.push({ file: atom.path, category: 'multi-singleton', message: 'languages.md already loaded' });
        } else cv.languages = v as Languages;
        break;
      case 'personal':
        if (cv.personal) {
          warnings.push({ file: atom.path, category: 'multi-singleton', message: 'personal.md already loaded' });
        } else cv.personal = v as Personal;
        break;
    }
  }

  cv.workExperience.sort(byPeriodStartDesc);
  cv.education.sort(byPeriodStartDesc);
  cv.community.sort(byPeriodStartDesc);
  cv.openSource.sort(byPeriodStartDesc);
  cv.awards.sort((a, b) => b.date.localeCompare(a.date));
  cv.publications.sort((a, b) => b.date.localeCompare(a.date));

  cv.projects = sortProjects(cv.projects);

  if (variant.sectionOrder.includes('identity')) {
    if (!cv.identity.about) {
      warnings.push({
        file: variantRoot, category: 'identity-missing',
        message: 'identity/about.md not found; Professional Summary section will be empty',
      });
    }
  }

  return { cv, warnings };
}

function addSchemaWarnings(warnings: LoadWarning[], file: string, issues: { path: (string | number)[]; message: string }[]): void {
  for (const i of issues) {
    warnings.push({
      file, category: 'schema',
      field: i.path.join('.'),
      message: i.message,
    });
  }
}

function byPeriodStartDesc<T extends { periodStart: string; order: number }>(a: T, b: T): number {
  const cmp = b.periodStart.localeCompare(a.periodStart);
  return cmp !== 0 ? cmp : a.order - b.order;
}

function sortProjects(projects: Project[]): Project[] {
  const groups = new Map<string, Project[]>();
  const groupOrder: string[] = [];
  for (const p of projects) {
    const key = p.parentExperience ?? '__none__';
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(p);
  }
  const out: Project[] = [];
  for (const key of groupOrder) {
    const arr = groups.get(key)!;
    arr.sort((a, b) => {
      const cmp = b.periodStart.localeCompare(a.periodStart);
      return cmp !== 0 ? cmp : a.order - b.order;
    });
    out.push(...arr);
  }
  return out;
}
