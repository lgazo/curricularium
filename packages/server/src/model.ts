import { z } from 'zod';

export const ContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

export const ProfileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  photo: z.string().optional(),
  location: z.string().optional(),
  contact: ContactSchema.default({}),
});

export const ExperienceEntrySchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  start: z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM'),
  end: z.union([
    z.string().regex(/^\d{4}-\d{2}$/),
    z.literal('Present'),
  ]),
  bullets: z.array(z.string()).default([]),
});

export const EducationEntrySchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  start: z.string().regex(/^\d{4}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}$/),
  notes: z.string().optional(),
});

export const SkillsGroupSchema = z.object({
  group: z.string().optional(),
  items: z.array(z.string()).min(1),
});

export const CVSchema = z.object({
  profile: ProfileSchema,
  about: z.string().optional(),
  experience: z.array(ExperienceEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  skills: z.array(SkillsGroupSchema).default([]),
});

export type CV = z.infer<typeof CVSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type SkillsGroup = z.infer<typeof SkillsGroupSchema>;

export type ParseError = {
  file: string;
  message: string;
  field?: string;
};

export type ParseResult =
  | { ok: true; cv: CV; warnings: ParseError[] }
  | { ok: false; errors: ParseError[] };
