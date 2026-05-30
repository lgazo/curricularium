import type { DateLike, SpecCV } from '../../spec/model.js';

const NS_DEFAULT = 'http://www.europass.eu/1.0';
const NS_OA = 'http://www.openapplications.org/oagis/9';
const NS_HR = 'http://www.hr-xml.org/3';
const NS_EURES = 'http://www.europass_eures.eu/1.0';
const NS_XSI = 'http://www.w3.org/2001/XMLSchema-instance';

export function buildEuropassCandidateXml(cv: SpecCV): string {
  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  out.push(
    `<Candidate xsi:schemaLocation="${NS_DEFAULT} Candidate.xsd"` +
      ` xmlns="${NS_DEFAULT}"` +
      ` xmlns:oa="${NS_OA}"` +
      ` xmlns:eures="${NS_EURES}"` +
      ` xmlns:hr="${NS_HR}"` +
      ` xmlns:xsi="${NS_XSI}">`,
  );

  out.push('  <hr:DocumentID schemeID="curricularium" schemeName="DocumentIdentifier" schemeAgencyName="EUROPASS" schemeVersionID="4.0"/>');

  out.push('  <CandidateSupplier>');
  out.push('    <hr:PartyID schemeID="curricularium" schemeName="PartyID" schemeAgencyName="EUROPASS" schemeVersionID="1.0"/>');
  out.push('    <hr:PartyName>Owner</hr:PartyName>');
  if (cv.personal) {
    out.push('    <PersonContact>');
    emitPersonName(out, cv.personal.fullName, '      ');
    out.push('    </PersonContact>');
  }
  out.push('    <hr:PrecedenceCode>1</hr:PrecedenceCode>');
  out.push('  </CandidateSupplier>');

  emitCandidatePerson(out, cv);
  emitCandidateProfile(out, cv);
  emitRenderingInformation(out, cv);

  out.push('</Candidate>');
  return out.join('\n');
}

function emitPersonName(out: string[], fullName: string, indent: string): void {
  const parts = fullName.trim().split(/\s+/);
  const given = parts[0] ?? '';
  const family = parts.slice(1).join(' ');
  out.push(`${indent}<PersonName>`);
  if (given) out.push(`${indent}  <oa:GivenName>${esc(given)}</oa:GivenName>`);
  if (family) out.push(`${indent}  <hr:FamilyName>${esc(family)}</hr:FamilyName>`);
  out.push(`${indent}</PersonName>`);
}

function emitCandidatePerson(out: string[], cv: SpecCV): void {
  out.push('  <CandidatePerson>');
  if (cv.personal) {
    emitPersonName(out, cv.personal.fullName, '    ');
    emitCommunications(out, cv.personal);
  }
  out.push('    <hr:BirthDate></hr:BirthDate>');
  out.push('  </CandidatePerson>');
}

function emitCommunications(out: string[], p: NonNullable<SpecCV['personal']>): void {
  if (p.phone) {
    const { dial, number, country } = parsePhone(p.phone);
    out.push('    <Communication>');
    out.push('      <ChannelCode>Telephone</ChannelCode>');
    out.push('      <UseCode>home</UseCode>');
    if (dial) out.push(`      <CountryDialing>${esc(dial)}</CountryDialing>`);
    out.push(`      <oa:DialNumber>${esc(number)}</oa:DialNumber>`);
    if (country) out.push(`      <CountryCode>${esc(country)}</CountryCode>`);
    out.push('    </Communication>');
  }

  if (p.email) {
    out.push('    <Communication>');
    out.push('      <ChannelCode>Email</ChannelCode>');
    out.push('      <UseCode>home</UseCode>');
    out.push(`      <Text>${esc(p.email)}</Text>`);
    out.push('    </Communication>');
  }

  const [city, country] = splitLoc(p.location);
  if (city || country) {
    const countryCode = countryToIso2(country) ?? '';
    out.push('    <Communication>');
    out.push('      <UseCode>home</UseCode>');
    out.push('      <Address type="home">');
    if (city) out.push(`        <oa:AddressLine>${esc(city)}</oa:AddressLine>`);
    if (countryCode) out.push(`        <CountryCode>${esc(countryCode)}</CountryCode>`);
    out.push('      </Address>');
    out.push('    </Communication>');
  }

  for (const profile of p.profiles) {
    out.push('    <Communication>');
    out.push('      <ChannelCode>Web</ChannelCode>');
    out.push('      <UseCode>home</UseCode>');
    out.push(`      <URL>${esc(profile.url)}</URL>`);
    out.push('    </Communication>');
  }
}

function emitCandidateProfile(out: string[], cv: SpecCV): void {
  const lang = cv.variant.lang || 'en';
  out.push(`  <CandidateProfile languageCode="${esc(lang)}">`);
  out.push('    <hr:ID schemeID="curricularium" schemeName="CandidateProfileID" schemeAgencyName="EUROPASS" schemeVersionID="1.0"/>');
  emitEmploymentHistory(out, cv);
  emitEducationHistory(out, cv);
  out.push('    <eures:Licenses/>');
  out.push('    <Certifications/>');
  emitPublicationHistory(out, cv);
  out.push('    <PersonQualifications/>');
  out.push('    <EmploymentReferences/>');
  out.push('    <CreativeWorks/>');
  emitProjects(out, cv);
  emitSocialAndPoliticalActivities(out, cv);
  emitSkills(out, cv);
  out.push('    <NetworksAndMemberships/>');
  out.push('    <ConferencesAndSeminars/>');
  out.push('    <VoluntaryWorks/>');
  out.push('    <CourseCertifications/>');
  out.push('  </CandidateProfile>');
}

type WorkEntry = {
  periodStart: DateLike;
  periodEnd: DateLike;
  position: string;
  employer: string;
  body: string;
  location: string | null;
  url: string | null;
};

function collectWorkEntries(cv: SpecCV): WorkEntry[] {
  const list: WorkEntry[] = [];
  for (const w of cv.workExperience) {
    list.push({
      periodStart: w.periodStart, periodEnd: w.periodEnd,
      position: w.position, employer: w.employer, body: w.body,
      location: w.location, url: null,
    });
  }
  return list;
}

function emitEmploymentHistory(out: string[], cv: SpecCV): void {
  const entries = collectWorkEntries(cv);
  if (entries.length === 0) {
    out.push('    <EmploymentHistory/>');
    return;
  }
  out.push('    <EmploymentHistory>');
  for (const w of entries) {
    out.push('      <EmployerHistory>');
    out.push(`        <OrganizationName languageID="${esc(cv.variant.lang || 'en')}">${esc(w.employer)}</OrganizationName>`);
    out.push('        <EmploymentPeriod>');
    out.push(`          <StartDate>${esc(dateText(w.periodStart))}</StartDate>`);
    if (w.periodEnd === 'present') {
      out.push('          <CurrentIndicator>true</CurrentIndicator>');
    } else {
      out.push(`          <EndDate>${esc(dateText(w.periodEnd))}</EndDate>`);
      out.push('          <CurrentIndicator>false</CurrentIndicator>');
    }
    out.push('        </EmploymentPeriod>');
    out.push('        <PositionHistory>');
    out.push(`          <PositionTitle>${esc(w.position)}</PositionTitle>`);
    if (w.body.trim()) {
      out.push(`          <Description>${esc(w.body.trim())}</Description>`);
    }
    const [city, country] = splitLoc(w.location ?? '');
    if (city) out.push(`          <City>${esc(city)}</City>`);
    const cc = countryToIso2(country);
    if (cc) out.push(`          <Country>${esc(cc)}</Country>`);
    out.push('        </PositionHistory>');
    out.push('      </EmployerHistory>');
  }
  out.push('    </EmploymentHistory>');
}

function emitEducationHistory(out: string[], cv: SpecCV): void {
  if (cv.education.length === 0) {
    out.push('    <EducationHistory/>');
    return;
  }
  out.push('    <EducationHistory>');
  for (const e of cv.education) {
    out.push('      <EducationOrganizationAttendance>');
    out.push(`        <OrganizationName languageID="${esc(cv.variant.lang || 'en')}">${esc(e.institution)}</OrganizationName>`);
    out.push(`        <ProgramName languageID="${esc(cv.variant.lang || 'en')}">${esc(e.degree)}</ProgramName>`);
    out.push('        <AttendancePeriod>');
    out.push('          <StartDate>');
    out.push(`            <FormattedDateTime>${esc(dateText(e.periodStart))}</FormattedDateTime>`);
    out.push('          </StartDate>');
    if (e.periodEnd === 'present') {
      out.push('          <Ongoing>true</Ongoing>');
    } else {
      out.push('          <EndDate>');
      out.push(`            <FormattedDateTime>${esc(dateText(e.periodEnd))}</FormattedDateTime>`);
      out.push('          </EndDate>');
    }
    out.push('        </AttendancePeriod>');
    out.push('        <EducationDegree>');
    out.push(`          <DegreeName languageID="${esc(cv.variant.lang || 'en')}">${esc(e.degree)}</DegreeName>`);
    if (e.field) {
      out.push('          <FieldOfStudy typeCode="FREETEXT">');
      out.push(`            <MainFieldOfStudy>${esc(e.field)}</MainFieldOfStudy>`);
      out.push('          </FieldOfStudy>');
    }
    out.push('        </EducationDegree>');
    if (e.url) out.push(`        <Link>${esc(e.url)}</Link>`);
    out.push('      </EducationOrganizationAttendance>');
  }
  out.push('    </EducationHistory>');
}

function emitPublicationHistory(out: string[], cv: SpecCV): void {
  if (cv.publications.length === 0) {
    out.push('    <PublicationHistory/>');
    return;
  }
  out.push('    <PublicationHistory>');
  for (const p of cv.publications) {
    out.push('      <Publication>');
    out.push(`        <Title languageID="${esc(cv.variant.lang || 'en')}">${esc(p.title)}</Title>`);
    if (p.body.trim()) out.push(`        <Description>${esc(p.body.trim())}</Description>`);
    out.push('        <Date>');
    out.push(`          <StartDate>${esc(dateText(p.date))}</StartDate>`);
    out.push('        </Date>');
    if (p.url) out.push(`        <Link>${esc(p.url)}</Link>`);
    out.push('      </Publication>');
  }
  out.push('    </PublicationHistory>');
}

function emitProjects(out: string[], cv: SpecCV): void {
  const all = [...cv.projects, ...cv.openSource];
  if (all.length === 0) {
    out.push('    <Projects/>');
    return;
  }
  out.push('    <Projects>');
  for (const p of cv.projects) {
    out.push('      <Project>');
    out.push(`        <Title languageID="${esc(cv.variant.lang || 'en')}">${esc(p.title)}</Title>`);
    out.push('        <Date>');
    out.push(`          <StartDate>${esc(dateText(p.periodStart))}</StartDate>`);
    if (p.periodEnd && p.periodEnd !== 'present') {
      out.push(`          <EndDate>${esc(dateText(p.periodEnd))}</EndDate>`);
    } else if (p.periodEnd === 'present') {
      out.push('          <Ongoing>true</Ongoing>');
    }
    out.push('        </Date>');
    if (p.body.trim()) out.push(`        <Description>${esc(p.body.trim())}</Description>`);
    if (p.url) out.push(`        <Link>${esc(p.url)}</Link>`);
    out.push('      </Project>');
  }
  for (const o of cv.openSource) {
    out.push('      <Project>');
    out.push(`        <Title languageID="${esc(cv.variant.lang || 'en')}">${esc(o.title)}</Title>`);
    out.push('        <Date>');
    out.push(`          <StartDate>${esc(dateText(o.periodStart))}</StartDate>`);
    if (o.periodEnd === 'present') {
      out.push('          <Ongoing>true</Ongoing>');
    } else {
      out.push(`          <EndDate>${esc(dateText(o.periodEnd))}</EndDate>`);
    }
    out.push('        </Date>');
    if (o.body.trim()) out.push(`        <Description>${esc(o.body.trim())}</Description>`);
    out.push(`        <Link>${esc(o.repoUrl)}</Link>`);
    out.push('      </Project>');
  }
  out.push('    </Projects>');
}

function emitSocialAndPoliticalActivities(out: string[], cv: SpecCV): void {
  if (cv.community.length === 0) {
    out.push('    <SocialAndPoliticalActivities/>');
    return;
  }
  out.push('    <SocialAndPoliticalActivities>');
  for (const c of cv.community) {
    out.push('      <SocialAndNetworkingActivity>');
    out.push('        <Activity>');
    out.push(`          <Title languageID="${esc(cv.variant.lang || 'en')}">${esc(c.role)} — ${esc(c.organisation)}</Title>`);
    out.push('          <Date>');
    out.push(`            <StartDate>${esc(dateText(c.periodStart))}</StartDate>`);
    if (c.periodEnd === 'present') {
      out.push('            <Ongoing>true</Ongoing>');
    } else {
      out.push(`            <EndDate>${esc(dateText(c.periodEnd))}</EndDate>`);
    }
    out.push('          </Date>');
    if (c.body.trim()) out.push(`          <Description>${esc(c.body.trim())}</Description>`);
    if (c.url) out.push(`          <Link>${esc(c.url)}</Link>`);
    out.push('        </Activity>');
    out.push('      </SocialAndNetworkingActivity>');
  }
  out.push('    </SocialAndPoliticalActivities>');
}

function emitSkills(out: string[], cv: SpecCV): void {
  const groups = cv.skills?.groups ?? [];
  if (groups.length === 0) {
    out.push('    <Skills/>');
    return;
  }
  const lang = cv.variant.lang || 'en';
  const communication: string[] = [];
  const organisational: string[] = [];
  const digital: string[] = [];
  const jobRelated: string[] = [];
  for (const g of groups) {
    const bucket = g.europassBucket
      ?? (g.name.toLowerCase().includes('digital') ? 'Digital'
        : g.name.toLowerCase().includes('communication') ? 'Communication'
        : (g.name.toLowerCase().includes('organisational') || g.name.toLowerCase().includes('organizational')) ? 'Organisational'
        : 'JobRelated');
    const entry = `${g.name}: ${g.items.join(', ')}`;
    if (bucket === 'Communication') communication.push(entry);
    else if (bucket === 'Organisational') organisational.push(entry);
    else if (bucket === 'Digital') digital.push(entry);
    else jobRelated.push(entry);
  }

  out.push('    <Skills>');
  if (communication.length > 0) {
    out.push('      <CommunicationAndInterpersonalSkills>');
    for (const e of communication) {
      out.push('        <CommunicationAndInterpersonalSkill>');
      out.push(`          <Title languageID="${esc(lang)}">${esc(e)}</Title>`);
      out.push('        </CommunicationAndInterpersonalSkill>');
    }
    out.push('      </CommunicationAndInterpersonalSkills>');
  }
  if (organisational.length > 0) {
    out.push('      <OrganisationalSkills>');
    for (const e of organisational) {
      out.push('        <OrganisationalSkill>');
      out.push(`          <Title languageID="${esc(lang)}">${esc(e)}</Title>`);
      out.push('        </OrganisationalSkill>');
    }
    out.push('      </OrganisationalSkills>');
  }
  if (jobRelated.length > 0) {
    out.push('      <ManagementAndLeadershipSkills>');
    for (const e of jobRelated) {
      out.push('        <ManagementAndLeadershipSkill>');
      out.push(`          <Title languageID="${esc(lang)}">${esc(e)}</Title>`);
      out.push('        </ManagementAndLeadershipSkill>');
    }
    out.push('      </ManagementAndLeadershipSkills>');
  }
  if (digital.length > 0) {
    out.push('      <DigitalSkills>');
    for (const e of digital) {
      out.push('        <DigitalSkillsGroup>');
      out.push(`          <Title languageID="${esc(lang)}">${esc(e)}</Title>`);
      out.push('        </DigitalSkillsGroup>');
    }
    out.push('      </DigitalSkills>');
  }
  out.push('    </Skills>');
}

function emitRenderingInformation(out: string[], _cv: SpecCV): void {
  out.push('  <RenderingInformation>');
  out.push('    <Design>');
  out.push('      <Template>Template1</Template>');
  out.push('      <Color>Default</Color>');
  out.push('      <FontSize>Medium</FontSize>');
  out.push('      <Logo>FirstPage</Logo>');
  out.push('      <PageNumbers>false</PageNumbers>');
  out.push('      <SectionsOrder>');
  for (const s of ['education-training', 'work-experience', 'profile-skills', 'language']) {
    out.push('        <Section>');
    out.push(`          <Title>${esc(s)}</Title>`);
    out.push('        </Section>');
  }
  out.push('      </SectionsOrder>');
  out.push('    </Design>');
  out.push('  </RenderingInformation>');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function splitLoc(s: string): [string, string] {
  if (!s) return ['', ''];
  const i = s.indexOf(',');
  if (i < 0) return [s.trim(), ''];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

function dateText(d: DateLike): string {
  if (d === 'present') return '';
  return d;
}

function parsePhone(raw: string): { dial: string; number: string; country: string } {
  const m = /^\+?(\d{1,3})[\s-]?(.+)$/.exec(raw.trim());
  if (m) {
    return { dial: m[1] ?? '', number: (m[2] ?? '').replace(/\s+/g, ''), country: '' };
  }
  return { dial: '', number: raw.trim(), country: '' };
}

const COUNTRY_ISO2: Record<string, string> = {
  slovakia: 'sk', slovak: 'sk',
  czechia: 'cz', 'czech republic': 'cz',
  austria: 'at',
  germany: 'de',
  hungary: 'hu',
  poland: 'pl',
  ukraine: 'ua',
  france: 'fr',
  spain: 'es',
  portugal: 'pt',
  italy: 'it',
  netherlands: 'nl',
  belgium: 'be',
  'united kingdom': 'gb', uk: 'gb',
  ireland: 'ie',
  switzerland: 'ch',
  sweden: 'se',
  norway: 'no',
  denmark: 'dk',
  finland: 'fi',
  estonia: 'ee',
  latvia: 'lv',
  lithuania: 'lt',
  romania: 'ro',
  bulgaria: 'bg',
  greece: 'el',
  croatia: 'hr',
  slovenia: 'si',
  serbia: 'rs',
  'united states': 'us', usa: 'us',
};

function countryToIso2(name: string): string | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(lower)) return lower;
  return COUNTRY_ISO2[lower] ?? null;
}
