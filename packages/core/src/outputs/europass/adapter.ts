import type { SkillGroup, SpecCV } from '../../spec/model.js';
import { formatDateEuropass, type EuropassDate } from '../../spec/canonical.js';

export type EuropassBucket = 'JobRelated' | 'Digital' | 'Communication' | 'Organisational';

export function resolveEuropassBucket(g: SkillGroup): EuropassBucket {
  if (g.europassBucket) return g.europassBucket;
  const lower = g.name.toLowerCase();
  if (lower.includes('digital')) return 'Digital';
  if (lower.includes('communication')) return 'Communication';
  if (lower.includes('organisational') || lower.includes('organizational')) return 'Organisational';
  return 'JobRelated';
}

export function buildEuropassXml(cv: SpecCV): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<EuropassCV xmlns="http://europass.cedefop.europa.eu/Europass" Locale="en">');

  if (cv.personal) {
    lines.push('  <Identification>');
    lines.push(`    <PersonName><FirstName>${esc(cv.personal.fullName.split(' ')[0] ?? '')}</FirstName><Surname>${esc(cv.personal.fullName.split(' ').slice(1).join(' '))}</Surname></PersonName>`);
    lines.push('    <ContactInfo>');
    const [city, country] = splitLoc(cv.personal.location);
    lines.push(`      <Address><Contact><AddressLine>${esc(city)}</AddressLine><Country><Label>${esc(country)}</Label></Country></Contact></Address>`);
    lines.push(`      <Email><Contact>${esc(cv.personal.email)}</Contact></Email>`);
    if (cv.personal.phone) {
      lines.push(`      <Telephone><Contact>${esc(cv.personal.phone)}</Contact></Telephone>`);
    }
    lines.push('    </ContactInfo>');
    lines.push('  </Identification>');
  }

  if (cv.identity.headline) {
    lines.push('  <Headline>');
    lines.push(`    <Description><Label>${esc(cv.identity.headline.body.trim())}</Label></Description>`);
    lines.push('  </Headline>');
  }

  if (cv.identity.about) {
    lines.push(`  <PersonalDescription><Label>${esc(cv.identity.about.body.trim())}</Label></PersonalDescription>`);
  }

  for (const w of cv.workExperience) {
    lines.push('  <WorkExperience>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(w.periodStart), formatDateEuropass(w.periodEnd))}</Period>`);
    lines.push(`    <Position><Label>${esc(w.position)}</Label></Position>`);
    lines.push(`    <Employer><Name>${esc(w.employer)}</Name></Employer>`);
    lines.push(`    <Activities><Label>${esc(w.body.trim())}</Label></Activities>`);
    lines.push('  </WorkExperience>');
  }

  for (const c of cv.community) {
    lines.push('  <WorkExperience>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(c.periodStart), formatDateEuropass(c.periodEnd))}</Period>`);
    lines.push(`    <Position><Label>${esc(c.role)}</Label></Position>`);
    lines.push(`    <Employer><Name>${esc(c.organisation)}</Name></Employer>`);
    lines.push(`    <Activities><Label>${esc(c.body.trim())}</Label></Activities>`);
    lines.push('    <Volunteer>true</Volunteer>');
    lines.push('  </WorkExperience>');
  }

  for (const o of cv.openSource) {
    lines.push('  <WorkExperience>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(o.periodStart), formatDateEuropass(o.periodEnd))}</Period>`);
    lines.push(`    <Position><Label>${esc(o.role)}</Label></Position>`);
    lines.push(`    <Employer><Name>${esc(o.title)}</Name><ContactInfo><Website><Contact>${esc(o.repoUrl)}</Contact></Website></ContactInfo></Employer>`);
    lines.push(`    <Activities><Label>${esc(o.body.trim())}</Label></Activities>`);
    lines.push('    <Volunteer>true</Volunteer>');
    lines.push('  </WorkExperience>');
  }

  for (const e of cv.education) {
    lines.push('  <Education>');
    lines.push(`    <Period>${periodXml(formatDateEuropass(e.periodStart), formatDateEuropass(e.periodEnd))}</Period>`);
    lines.push(`    <Title><Label>${esc(e.degree)}</Label></Title>`);
    lines.push(`    <Organisation><Name>${esc(e.institution)}</Name></Organisation>`);
    if (e.field) lines.push(`    <Subjects><Label>${esc(e.field)}</Label></Subjects>`);
    lines.push('  </Education>');
  }

  if (cv.skills && cv.skills.groups.length > 0) {
    const buckets: Record<EuropassBucket, string[]> = {
      JobRelated: [], Digital: [], Communication: [], Organisational: [],
    };
    for (const g of cv.skills.groups) {
      buckets[resolveEuropassBucket(g)].push(`${g.name}: ${g.items.join(', ')}`);
    }
    lines.push('  <Skills>');
    for (const bucket of ['JobRelated', 'Digital', 'Communication', 'Organisational'] as EuropassBucket[]) {
      if (buckets[bucket].length === 0) continue;
      lines.push(`    <${bucket}><Description><Label>${esc(buckets[bucket].join('. '))}</Label></Description></${bucket}>`);
    }
    if (cv.languages) {
      lines.push('    <Linguistic>');
      for (const l of cv.languages.languages) {
        if (l.level === 'native') {
          lines.push(`      <MotherTongue><Description><Label>${esc(l.name)}</Label></Description></MotherTongue>`);
        } else {
          lines.push('      <ForeignLanguage>');
          lines.push(`        <Description><Label>${esc(l.name)}</Label></Description>`);
          lines.push(`        <ProficiencyLevel><Listening>${esc(l.level)}</Listening><Reading>${esc(l.level)}</Reading><SpokenInteraction>${esc(l.level)}</SpokenInteraction><SpokenProduction>${esc(l.level)}</SpokenProduction><Writing>${esc(l.level)}</Writing></ProficiencyLevel>`);
          lines.push('      </ForeignLanguage>');
        }
      }
      lines.push('    </Linguistic>');
    }
    lines.push('  </Skills>');
  }

  for (const a of cv.awards) {
    lines.push(`  <Honour><Date>${dateOnly(formatDateEuropass(a.date))}</Date><Title><Label>${esc(a.title)}</Label></Title><AwardingBody><Label>${esc(a.awarder)}</Label></AwardingBody></Honour>`);
  }

  for (const p of cv.publications) {
    lines.push(`  <Publication><Date>${dateOnly(formatDateEuropass(p.date))}</Date><Title><Label>${esc(p.title)}</Label></Title><Publisher><Label>${esc(p.publisher)}</Label></Publisher></Publication>`);
  }

  lines.push('</EuropassCV>');
  return lines.join('\n');
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
  parts.push(`<From>${'current' in from ? '<Year>0</Year>' : dateOnly(from)}</From>`);
  parts.push(`<To>${'current' in to ? '<Current>true</Current>' : dateOnly(to)}</To>`);
  return parts.join('');
}

function dateOnly(d: EuropassDate): string {
  if ('current' in d) return '<Current>true</Current>';
  const parts: string[] = [];
  parts.push(`<Year>${esc(d.year)}</Year>`);
  if (d.month) parts.push(`<Month>${esc(d.month)}</Month>`);
  return parts.join('');
}
