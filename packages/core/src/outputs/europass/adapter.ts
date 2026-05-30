import type { DateLike, SkillGroup, SpecCV } from '../../spec/model.js';
import { formatDateEuropass, type EuropassDate } from '../../spec/canonical.js';
import type { PhotoData } from '../../spec/photo.js';

export type EuropassOptions = { photo?: PhotoData | null };

export type EuropassBucket = 'JobRelated' | 'Digital' | 'Communication' | 'Organisational';

export function resolveEuropassBucket(g: SkillGroup): EuropassBucket {
  if (g.europassBucket) return g.europassBucket;
  const lower = g.name.toLowerCase();
  if (lower.includes('digital')) return 'Digital';
  if (lower.includes('communication')) return 'Communication';
  if (lower.includes('organisational') || lower.includes('organizational')) return 'Organisational';
  return 'JobRelated';
}

const NS = 'http://europass.cedefop.europa.eu/Europass';
const XSD_URL = 'http://europass.cedefop.europa.eu/xml/v3.4.0/EuropassSchema.xsd';

export function buildEuropassXml(cv: SpecCV, opts: EuropassOptions = {}): string {
  const now = new Date().toISOString();
  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push(`<SkillsPassport xmlns="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${NS} ${XSD_URL}" locale="en">`);

  out.push('  <DocumentInfo>');
  out.push('    <DocumentType>ECV</DocumentType>');
  out.push(`    <CreationDate>${now}</CreationDate>`);
  out.push(`    <LastUpdateDate>${now}</LastUpdateDate>`);
  out.push('    <XSDVersion>V3.4</XSDVersion>');
  out.push('    <Generator>curricularium</Generator>');
  out.push('  </DocumentInfo>');

  out.push('  <LearnerInfo>');

  if (cv.personal) emitIdentification(out, cv, opts.photo ?? null);
  if (cv.identity.headline) emitHeadline(out, cv.identity.headline.body);
  emitWorkExperienceList(out, cv);
  emitEducationList(out, cv);
  emitSkills(out, cv);
  emitAchievementList(out, cv);

  out.push('  </LearnerInfo>');
  out.push('</SkillsPassport>');
  return out.join('\n');
}

function emitIdentification(out: string[], cv: SpecCV, photo: PhotoData | null): void {
  const p = cv.personal!;
  out.push('    <Identification>');
  const parts = p.fullName.split(' ');
  const first = parts[0] ?? '';
  const last = parts.slice(1).join(' ');
  out.push('      <PersonName>');
  if (first) out.push(`        <FirstName>${esc(first)}</FirstName>`);
  if (last) out.push(`        <Surname>${esc(last)}</Surname>`);
  out.push('      </PersonName>');

  if (photo) {
    out.push('      <Photo>');
    out.push(`        <MimeType>${esc(photo.mime)}</MimeType>`);
    out.push(`        <Data>${photo.base64}</Data>`);
    out.push('      </Photo>');
  }

  out.push('      <ContactInfo>');
  const [city, country] = splitLoc(p.location);
  if (city || country) {
    out.push('        <Address>');
    out.push('          <Contact>');
    if (city) out.push(`            <Municipality>${esc(city)}</Municipality>`);
    if (country) {
      out.push('            <Country>');
      out.push(`              <Label>${esc(country)}</Label>`);
      out.push('            </Country>');
    }
    out.push('          </Contact>');
    out.push('        </Address>');
  }
  if (p.email) {
    out.push('        <Email>');
    out.push(`          <Contact>${esc(p.email)}</Contact>`);
    out.push('        </Email>');
  }
  if (p.phone) {
    out.push('        <TelephoneList>');
    out.push('          <Telephone>');
    out.push(`            <Contact>${esc(p.phone)}</Contact>`);
    out.push('            <Use><Code>mobile</Code><Label>Mobile</Label></Use>');
    out.push('          </Telephone>');
    out.push('        </TelephoneList>');
  }
  if (p.profiles.length > 0) {
    out.push('        <WebsiteList>');
    for (const pr of p.profiles) {
      out.push('          <Website>');
      out.push(`            <Contact>${esc(pr.url)}</Contact>`);
      out.push('            <Use><Code>personal</Code><Label>Personal</Label></Use>');
      out.push('          </Website>');
    }
    out.push('        </WebsiteList>');
  }
  out.push('      </ContactInfo>');
  out.push('    </Identification>');
}

function emitHeadline(out: string[], body: string): void {
  const t = body.trim();
  if (!t) return;
  out.push('    <Headline>');
  out.push('      <Type><Code>position</Code><Label>Position</Label></Type>');
  out.push(`      <Description><Label>${esc(t)}</Label></Description>`);
  out.push('    </Headline>');
}

type WorkEntry = {
  periodStart: DateLike;
  periodEnd: DateLike;
  position: string;
  employer: string;
  body: string;
  url: string | null;
};

function collectWorkEntries(cv: SpecCV): WorkEntry[] {
  const list: WorkEntry[] = [];
  for (const w of cv.workExperience) {
    list.push({ periodStart: w.periodStart, periodEnd: w.periodEnd, position: w.position, employer: w.employer, body: w.body, url: null });
  }
  for (const p of cv.projects) {
    const employer = p.client ? `${p.employer} — ${p.client}` : p.employer;
    list.push({ periodStart: p.periodStart, periodEnd: p.periodEnd ?? ('present' as DateLike), position: p.title, employer, body: p.body, url: p.url });
  }
  for (const c of cv.community) {
    list.push({ periodStart: c.periodStart, periodEnd: c.periodEnd, position: c.role, employer: c.organisation, body: c.body, url: c.url });
  }
  for (const o of cv.openSource) {
    list.push({ periodStart: o.periodStart, periodEnd: o.periodEnd, position: o.role, employer: o.title, body: o.body, url: o.repoUrl });
  }
  return list;
}

function emitWorkExperienceList(out: string[], cv: SpecCV): void {
  const entries = collectWorkEntries(cv);
  if (entries.length === 0) return;
  out.push('    <WorkExperienceList>');
  for (const w of entries) {
    out.push('      <WorkExperience>');
    out.push(`        <Period>${periodXml(formatDateEuropass(w.periodStart), formatDateEuropass(w.periodEnd))}</Period>`);
    out.push(`        <Position><Label>${esc(w.position)}</Label></Position>`);
    const body = w.body.trim();
    if (body) out.push(`        <Activities>${esc(body)}</Activities>`);
    out.push('        <Employer>');
    out.push(`          <Name>${esc(w.employer)}</Name>`);
    if (w.url) {
      out.push('          <ContactInfo>');
      out.push('            <WebsiteList>');
      out.push('              <Website>');
      out.push(`                <Contact>${esc(w.url)}</Contact>`);
      out.push('              </Website>');
      out.push('            </WebsiteList>');
      out.push('          </ContactInfo>');
    }
    out.push('        </Employer>');
    out.push('      </WorkExperience>');
  }
  out.push('    </WorkExperienceList>');
}

function emitEducationList(out: string[], cv: SpecCV): void {
  if (cv.education.length === 0) return;
  out.push('    <EducationList>');
  for (const e of cv.education) {
    out.push('      <Education>');
    out.push(`        <Period>${periodXml(formatDateEuropass(e.periodStart), formatDateEuropass(e.periodEnd))}</Period>`);
    out.push(`        <Title>${esc(e.degree)}</Title>`);
    if (e.field) out.push(`        <Activities>${esc(e.field)}</Activities>`);
    out.push('        <Organisation>');
    out.push(`          <Name>${esc(e.institution)}</Name>`);
    out.push('        </Organisation>');
    out.push('      </Education>');
  }
  out.push('    </EducationList>');
}

function emitSkills(out: string[], cv: SpecCV): void {
  const hasSkills = cv.skills && cv.skills.groups.length > 0;
  const hasLanguages = cv.languages && cv.languages.languages.length > 0;
  if (!hasSkills && !hasLanguages) return;
  out.push('    <Skills>');

  if (cv.languages && hasLanguages) {
    out.push('      <Linguistic>');
    const natives = cv.languages.languages.filter((l) => l.level === 'native');
    const foreigns = cv.languages.languages.filter((l) => l.level !== 'native');
    if (natives.length > 0) {
      out.push('        <MotherTongueList>');
      for (const l of natives) {
        out.push('          <MotherTongue>');
        out.push('            <Description>');
        if (l.code) out.push(`              <Code>${esc(l.code)}</Code>`);
        out.push(`              <Label>${esc(l.name)}</Label>`);
        out.push('            </Description>');
        out.push('          </MotherTongue>');
      }
      out.push('        </MotherTongueList>');
    }
    if (foreigns.length > 0) {
      out.push('        <ForeignLanguageList>');
      for (const l of foreigns) {
        out.push('          <ForeignLanguage>');
        out.push('            <Description>');
        if (l.code) out.push(`              <Code>${esc(l.code)}</Code>`);
        out.push(`              <Label>${esc(l.name)}</Label>`);
        out.push('            </Description>');
        out.push('            <ProficiencyLevel>');
        out.push(`              <Listening>${esc(l.level)}</Listening>`);
        out.push(`              <Reading>${esc(l.level)}</Reading>`);
        out.push(`              <SpokenInteraction>${esc(l.level)}</SpokenInteraction>`);
        out.push(`              <SpokenProduction>${esc(l.level)}</SpokenProduction>`);
        out.push(`              <Writing>${esc(l.level)}</Writing>`);
        out.push('            </ProficiencyLevel>');
        out.push('          </ForeignLanguage>');
      }
      out.push('        </ForeignLanguageList>');
    }
    out.push('      </Linguistic>');
  }

  if (cv.skills) {
    const buckets: Record<EuropassBucket, string[]> = {
      JobRelated: [], Digital: [], Communication: [], Organisational: [],
    };
    for (const g of cv.skills.groups) {
      buckets[resolveEuropassBucket(g)].push(`${g.name}: ${g.items.join(', ')}`);
    }
    if (buckets.Communication.length > 0) {
      out.push(`      <Communication><Description>${esc(buckets.Communication.join('. '))}</Description></Communication>`);
    }
    if (buckets.Organisational.length > 0) {
      out.push(`      <Organisational><Description>${esc(buckets.Organisational.join('. '))}</Description></Organisational>`);
    }
    if (buckets.JobRelated.length > 0) {
      out.push(`      <JobRelated><Description>${esc(buckets.JobRelated.join('. '))}</Description></JobRelated>`);
    }
    if (buckets.Digital.length > 0) {
      out.push(`      <Computer><Description>${esc(buckets.Digital.join('. '))}</Description></Computer>`);
    }
  }

  out.push('    </Skills>');
}

function emitAchievementList(out: string[], cv: SpecCV): void {
  if (cv.awards.length === 0 && cv.publications.length === 0) return;
  out.push('    <AchievementList>');
  if (cv.awards.length > 0) {
    const desc = cv.awards.map((a) => `${a.title} (${a.awarder})`).join('; ');
    out.push('      <Achievement>');
    out.push('        <Title><Code>honors_awards</Code><Label>Honours and Awards</Label></Title>');
    out.push(`        <Description>${esc(desc)}</Description>`);
    out.push('      </Achievement>');
  }
  if (cv.publications.length > 0) {
    const desc = cv.publications.map((p) => `${p.title} (${p.publisher})`).join('; ');
    out.push('      <Achievement>');
    out.push('        <Title><Code>publications</Code><Label>Publications</Label></Title>');
    out.push(`        <Description>${esc(desc)}</Description>`);
    out.push('      </Achievement>');
  }
  out.push('    </AchievementList>');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function splitLoc(s: string): [string, string] {
  const i = s.indexOf(',');
  if (i < 0) return [s.trim(), ''];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

function periodXml(from: EuropassDate, to: EuropassDate): string {
  const parts: string[] = [];
  if (!('current' in from)) parts.push(dateTag('From', from));
  if ('current' in to) parts.push('<Current>true</Current>');
  else parts.push(dateTag('To', to));
  return parts.join('');
}

function dateTag(tag: 'From' | 'To', d: { year: string; month?: string }): string {
  const attrs: string[] = [`year="${esc(d.year)}"`];
  if (d.month) attrs.push(`month="${esc(d.month)}"`);
  return `<${tag} ${attrs.join(' ')}/>`;
}
