import { z } from 'zod';
import { DEFAULT_SECTION_ORDER } from './canonical.js';
import type { SectionType } from './model.js';

const DateLikeSchema = z
  .string()
  .transform((s) => (s.toLowerCase() === 'present' ? 'present' : s))
  .refine(
    (s) => s === 'present' || /^\d{4}(-\d{2})?$/.test(s),
    { message: 'expected YYYY, YYYY-MM, or "present"' },
  );

const SectionTypeSchema = z.enum([
  'personal', 'identity', 'work-experience', 'project',
  'skill', 'education', 'community', 'open-source',
  'award', 'publication', 'language',
]);

const AtomBaseFields = {
  name: z.string().min(1),
  source: z.string().nullable().default(null),
  order: z.number().int().default(0),
  lang: z.string().default('en'),
  'variant-rationale': z.string().optional(),
};

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function withBase<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...AtomBaseFields, ...shape }).transform((raw) => {
    const { 'variant-rationale': vr, ...rest } = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      out[kebabToCamel(k)] = v;
    }
    if (vr !== undefined) out['variantRationale'] = vr;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return out as any;
  });
}

export const WorkExperienceSchema = withBase({
  type: z.literal('work-experience'),
  employer: z.string().min(1),
  position: z.string().min(1),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  location: z.string().min(1),
  url: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  'ref-projects': z.array(z.string()).default([]),
  'team-size': z.number().int().nullable().default(null),
  'report-line': z.string().nullable().default(null),
  body: z.string().default(''),
});

export const ProjectSchema = withBase({
  type: z.literal('project'),
  title: z.string().min(1),
  client: z.string().nullable().default(null),
  employer: z.string().min(1),
  'parent-experience': z.string().nullable().default(null),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema.nullable().default(null),
  location: z.string().nullable().default(null),
  sector: z.string().default(''),
  roles: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
  url: z.string().nullable().default(null),
  keywords: z.array(z.string()).default([]),
  body: z.string().default(''),
});

export const EducationSchema = withBase({
  type: z.literal('education'),
  institution: z.string().min(1),
  location: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().default(''),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  honours: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  body: z.string().default(''),
});

export const CommunitySchema = withBase({
  type: z.literal('community'),
  organisation: z.string().min(1),
  role: z.string().min(1),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  location: z.string().nullable().default(null),
  url: z.string().nullable().default(null),
  body: z.string().default(''),
});

export const OpenSourceSchema = withBase({
  type: z.literal('open-source'),
  title: z.string().min(1),
  'repo-url': z.string().min(1),
  role: z.enum(['author', 'maintainer', 'contributor']),
  'period-start': DateLikeSchema,
  'period-end': DateLikeSchema,
  tech: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  body: z.string().default(''),
});

export const AwardSchema = withBase({
  type: z.literal('award'),
  title: z.string().min(1),
  awarder: z.string().min(1),
  date: DateLikeSchema,
  url: z.string().nullable().default(null),
  body: z.string().default(''),
});

export const PublicationSchema = withBase({
  type: z.literal('publication'),
  title: z.string().min(1),
  publisher: z.string().min(1),
  date: DateLikeSchema,
  url: z.string().nullable().default(null),
  authors: z.array(z.string()).default([]),
  body: z.string().default(''),
});

const SkillGroupSchema = z.object({
  name: z.string().min(1),
  items: z.array(z.string()).min(1),
  level: z.string().nullable().default(null),
  'europass-bucket': z.enum(['JobRelated', 'Digital', 'Communication', 'Organisational']).optional(),
}).transform((g) => {
  const out: Record<string, unknown> = { name: g.name, items: g.items, level: g.level };
  if (g['europass-bucket']) out['europassBucket'] = g['europass-bucket'];
  return out;
});

export const SkillsSchema = withBase({
  type: z.literal('skill'),
  groups: z.array(SkillGroupSchema).min(1),
  body: z.string().default(''),
});

const LanguageSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native']),
  detail: z.string().nullable().default(null),
});

export const LanguagesSchema = withBase({
  type: z.literal('language'),
  languages: z.array(LanguageSchema).min(1),
  body: z.string().default(''),
});

const ProfileSchema = z.object({
  network: z.string().min(1),
  url: z.string().min(1),
  username: z.string().nullable().default(null),
});

export const PersonalSchema = withBase({
  type: z.literal('personal'),
  'full-name': z.string().min(1),
  'target-role': z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().default(null),
  location: z.string().min(1),
  profiles: z.array(ProfileSchema).default([]),
  body: z.string().default(''),
});

export const IdentityHeadlineSchema = withBase({
  type: z.literal('identity'),
  subtype: z.literal('headline'),
  body: z.string().default(''),
});

export const IdentityAboutSchema = withBase({
  type: z.literal('identity'),
  subtype: z.literal('about'),
  body: z.string().default(''),
});

export const VariantManifestSchema = z.object({
  type: z.literal('variant'),
  name: z.string().min(1),
  title: z.string().min(1),
  'target-role': z.string().min(1),
  'section-order': z.array(SectionTypeSchema).optional(),
  lang: z.string().default('en'),
  'source-master': z.string().default(''),
  'output-targets': z.array(z.string()).default([]),
  'summary-mode': z.enum(['summary', 'objective']).default('summary'),
  'collapse-open-source': z.boolean().default(false),
  body: z.string().default(''),
}).transform((raw) => ({
  type: raw.type,
  name: raw.name,
  title: raw.title,
  targetRole: raw['target-role'],
  sectionOrder: (raw['section-order'] ?? DEFAULT_SECTION_ORDER) as SectionType[],
  lang: raw.lang,
  sourceMaster: raw['source-master'],
  outputTargets: raw['output-targets'],
  summaryMode: raw['summary-mode'],
  collapseOpenSource: raw['collapse-open-source'],
  body: raw.body,
}));

export const AtomSchemaByType = {
  'work-experience': WorkExperienceSchema,
  'project': ProjectSchema,
  'education': EducationSchema,
  'community': CommunitySchema,
  'open-source': OpenSourceSchema,
  'award': AwardSchema,
  'publication': PublicationSchema,
  'skill': SkillsSchema,
  'language': LanguagesSchema,
  'personal': PersonalSchema,
} as const;
