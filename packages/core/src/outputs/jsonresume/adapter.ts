import type { SpecCV } from '../../spec/model.js';
import { formatDateISO } from '../../spec/canonical.js';

export type JsonResume = {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; region?: string; countryCode?: string };
    profiles?: { network: string; username?: string; url: string }[];
  };
  work?: WorkEntry[];
  volunteer?: WorkEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  publications?: PublicationEntry[];
  skills?: SkillEntry[];
  languages?: LanguageEntry[];
  projects?: ProjectEntry[];
  openSource?: ProjectEntry[];   // extension
};

type WorkEntry = {
  name: string;
  position: string;
  location?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
};

type ProjectEntry = {
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  keywords?: string[];
  highlights?: string[];
  roles?: string[];
};

type EducationEntry = {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
};

type AwardEntry = { title: string; date?: string; awarder?: string; summary?: string };
type PublicationEntry = { name: string; publisher?: string; releaseDate?: string; url?: string; summary?: string };
type SkillEntry = { name: string; level?: string; keywords?: string[] };
type LanguageEntry = { language: string; fluency?: string };

export function specCvToJsonResume(cv: SpecCV): JsonResume {
  const out: JsonResume = {};

  if (cv.personal) {
    const [city, country] = splitLocation(cv.personal.location);
    out.basics = {
      name: cv.personal.fullName,
      label: cv.identity.headline?.body.trim() || undefined,
      email: cv.personal.email,
      phone: cv.personal.phone ?? undefined,
      summary: cv.identity.about?.body.trim() || undefined,
      location: { city, countryCode: country },
      profiles: cv.personal.profiles.length
        ? cv.personal.profiles.map((p) => ({
            network: p.network,
            url: p.url,
            username: p.username ?? undefined,
          }))
        : undefined,
    };
  }

  out.work = cv.workExperience.map((w) => ({
    name: w.employer,
    position: w.position,
    location: w.location,
    url: w.url ?? undefined,
    startDate: formatDateISO(w.periodStart) ?? undefined,
    endDate: formatDateISO(w.periodEnd) ?? undefined,
    ...bodyToSummaryHighlights(w.body),
  }));

  out.volunteer = cv.community.map((c) => ({
    name: c.organisation,
    position: c.role,
    location: c.location ?? undefined,
    url: c.url ?? undefined,
    startDate: formatDateISO(c.periodStart) ?? undefined,
    endDate: formatDateISO(c.periodEnd) ?? undefined,
    ...bodyToSummaryHighlights(c.body),
  }));

  const projects = cv.projects.map((p) => ({
    name: p.title,
    description: p.body ? bodyToSummaryHighlights(p.body).summary : undefined,
    url: p.url ?? undefined,
    startDate: formatDateISO(p.periodStart) ?? undefined,
    endDate: p.periodEnd ? formatDateISO(p.periodEnd) ?? undefined : undefined,
    keywords: p.tech.length ? p.tech : undefined,
    roles: p.roles.length ? p.roles : undefined,
  }));

  if (cv.variant.collapseOpenSource) {
    out.projects = [
      ...projects,
      ...cv.openSource.map((o) => osToProject(o)),
    ];
  } else {
    out.projects = projects;
    if (cv.openSource.length > 0) {
      out.openSource = cv.openSource.map((o) => osToProject(o));
    }
  }

  out.education = cv.education.map((e) => ({
    institution: e.institution,
    area: e.field || undefined,
    studyType: e.degree,
    startDate: formatDateISO(e.periodStart) ?? undefined,
    endDate: formatDateISO(e.periodEnd) ?? undefined,
    url: e.url ?? undefined,
  }));

  out.awards = cv.awards.map((a) => ({
    title: a.title,
    date: formatDateISO(a.date) ?? undefined,
    awarder: a.awarder,
    summary: a.body || undefined,
  }));

  out.publications = cv.publications.map((p) => ({
    name: p.title,
    publisher: p.publisher,
    releaseDate: formatDateISO(p.date) ?? undefined,
    url: p.url ?? undefined,
    summary: p.body || undefined,
  }));

  if (cv.skills) {
    out.skills = cv.skills.groups.map((g) => ({
      name: g.name,
      level: g.level ?? undefined,
      keywords: g.items.length ? g.items : undefined,
    }));
  }

  if (cv.languages) {
    out.languages = cv.languages.languages.map((l) => ({
      language: l.name,
      fluency: l.level === 'native' ? 'Native' : l.level,
    }));
  }

  return out;
}

function osToProject(o: SpecCV['openSource'][number]): ProjectEntry {
  return {
    name: o.title,
    description: o.body ? bodyToSummaryHighlights(o.body).summary : undefined,
    url: o.repoUrl,
    startDate: formatDateISO(o.periodStart) ?? undefined,
    endDate: formatDateISO(o.periodEnd) ?? undefined,
    keywords: o.tech.length ? o.tech : undefined,
    roles: [o.role],
  };
}

function splitLocation(s: string): [string | undefined, string | undefined] {
  const i = s.indexOf(',');
  if (i < 0) return [s.trim(), undefined];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

export function bodyToSummaryHighlights(body: string): { summary?: string; highlights?: string[] } {
  const lines = body.split(/\r?\n/);
  const summaryParts: string[] = [];
  const highlights: string[] = [];
  let sawBullet = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const bulletMatch = /^\s*-\s+(.*)$/.exec(line);
    if (bulletMatch) {
      sawBullet = true;
      highlights.push(bulletMatch[1]!.trim());
      continue;
    }
    if (line.trim().length === 0) {
      if (sawBullet) summaryParts.push('');
      continue;
    }
    const quoteMatch = /^\s*>\s*(.*)$/.exec(line);
    if (quoteMatch) {
      summaryParts.push(quoteMatch[1]!.trim());
      continue;
    }
    summaryParts.push(line.trim());
  }

  return {
    summary: summaryParts.length ? summaryParts.filter(Boolean).join(' ').trim() || undefined : undefined,
    highlights: highlights.length ? highlights : undefined,
  };
}
