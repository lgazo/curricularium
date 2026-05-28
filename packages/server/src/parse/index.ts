import { CVSchema, type ParseError, type ParseResult } from '../model.js';
import { parseAbout } from './about.js';
import { parseEducation } from './education.js';
import { parseExperience } from './experience.js';
import { parseProfile } from './profile.js';
import { parseSkills } from './skills.js';

export async function loadSource(dir: string): Promise<ParseResult> {
  const profileResult = await parseProfile(dir);
  if ('errors' in profileResult) return { ok: false, errors: profileResult.errors };

  const about = await parseAbout(dir);
  const experience = await parseExperience(dir);
  const education = await parseEducation(dir);
  const skills = await parseSkills(dir);

  const errors: ParseError[] = [
    ...experience.errors,
    ...education.errors,
    ...skills.errors,
  ];

  const candidate = {
    profile: profileResult.profile,
    about,
    experience: experience.entries,
    education: education.entries,
    skills: skills.skills,
  };

  const parsed = CVSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: [
        ...errors,
        ...parsed.error.issues.map((i) => ({
          file: dir,
          field: i.path.join('.'),
          message: i.message,
        })),
      ],
    };
  }

  return { ok: true, cv: parsed.data, warnings: errors };
}
