import '../../src/outputs/index.js';
import { describe, expect, it } from 'vitest';
import { findTheme } from '../../src/outputs/registry.js';
import { resolveEuropassBucket } from '../../src/outputs/europass/adapter.js';
import type { SpecCV } from '../../src/spec/model.js';

function cv(): SpecCV {
  return {
    variantRoot: '/r',
    variant: {
      type: 'variant', name: 'x', title: 'X', targetRole: 'X',
      sectionOrder: ['personal', 'identity', 'work-experience', 'skill', 'language'],
      lang: 'en', sourceMaster: '', outputTargets: [],
      summaryMode: 'summary', collapseOpenSource: false, body: '',
    },
    personal: {
      type: 'personal', name: 'p', source: null, order: 0, lang: 'en',
      fullName: 'Jane Doe', targetRole: 'CTO', email: 'j@x.com', phone: '+421000000000',
      location: 'Bratislava, Slovakia', profiles: [], photo: null, body: '',
    },
    identity: {
      headline: { type: 'identity', subtype: 'headline', name: 'h', source: null, order: 0, lang: 'en', body: 'CTO headline' },
      about: { type: 'identity', subtype: 'about', name: 'a', source: null, order: 0, lang: 'en', body: 'About text.' },
    },
    workExperience: [{
      type: 'work-experience', name: 'foo', source: null, order: 0, lang: 'en',
      employer: 'Foo Inc', position: 'CTO', periodStart: '2022-01', periodEnd: 'present',
      location: 'Remote', url: null, skills: [], keywords: [], refProjects: [],
      teamSize: null, reportLine: null, body: 'Led migration.',
    }],
    projects: [], education: [], community: [], openSource: [], awards: [], publications: [],
    skills: {
      type: 'skill', name: 'skills', source: null, order: 0, lang: 'en',
      groups: [
        { name: 'Leadership', items: ['mentoring'], level: null },
        { name: 'Communication style', items: ['speaking'], level: null },
        { name: 'Tools', items: ['TypeScript'], level: null, europassBucket: 'Digital' },
      ],
      body: '',
    },
    languages: {
      type: 'language', name: 'languages', source: null, order: 0, lang: 'en',
      languages: [
        { code: 'sk', name: 'Slovak', level: 'native', detail: null },
        { code: 'en', name: 'English', level: 'C2', detail: null },
      ],
      body: '',
    },
  };
}

describe('europass bucket resolution', () => {
  it('uses explicit europassBucket when present', () => {
    expect(resolveEuropassBucket({ name: 'Tools', items: [], level: null, europassBucket: 'Digital' }))
      .toBe('Digital');
  });

  it('detects bucket from name substring (case-insensitive)', () => {
    expect(resolveEuropassBucket({ name: 'Communication style', items: [], level: null }))
      .toBe('Communication');
    expect(resolveEuropassBucket({ name: 'Digital fluency', items: [], level: null }))
      .toBe('Digital');
    expect(resolveEuropassBucket({ name: 'Organisational habits', items: [], level: null }))
      .toBe('Organisational');
  });

  it('falls back to JobRelated', () => {
    expect(resolveEuropassBucket({ name: 'Leadership', items: [], level: null }))
      .toBe('JobRelated');
  });
});

describe('europass canonical theme', () => {
  it('renders SkillsPassport with DocumentInfo, Identification, Headline, WorkExperience', async () => {
    const t = findTheme('europass', 'canonical')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<SkillsPassport');
    expect(xml).toContain('<DocumentType>ECV</DocumentType>');
    expect(xml).toContain('<XSDVersion>V3.4</XSDVersion>');
    expect(xml).toContain('<LearnerInfo>');
    expect(xml).toContain('<Identification>');
    expect(xml).toContain('Jane');
    expect(xml).toContain('Doe');
    expect(xml).toContain('<Headline>');
    expect(xml).toContain('CTO headline');
    expect(xml).toContain('<WorkExperienceList>');
    expect(xml).toContain('<WorkExperience>');
    expect(xml).toContain('<Employer>');
    expect(xml).toContain('Foo Inc');
    expect(xml).toContain('<Current>true</Current>');
  });

  it('renders skills into the correct Europass buckets', async () => {
    const t = findTheme('europass', 'canonical')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<JobRelated>');
    expect(xml).toContain('mentoring');
    expect(xml).toContain('<Communication>');
    expect(xml).toContain('speaking');
    expect(xml).toContain('<Computer>');
    expect(xml).toContain('TypeScript');
  });

  it('renders languages with MotherTongue and ForeignLanguage CEFR levels', async () => {
    const t = findTheme('europass', 'canonical')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<MotherTongue>');
    expect(xml).toContain('Slovak');
    expect(xml).toContain('<ForeignLanguage>');
    expect(xml).toContain('English');
    expect(xml).toContain('C2');
  });
});

describe('europass candidate (v4) theme', () => {
  it('renders Candidate root with HR-XML / OAGIS namespaces and required envelope', async () => {
    const t = findTheme('europass', 'candidate')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<Candidate');
    expect(xml).toContain('xmlns="http://www.europass.eu/1.0"');
    expect(xml).toContain('xmlns:oa="http://www.openapplications.org/oagis/9"');
    expect(xml).toContain('xmlns:hr="http://www.hr-xml.org/3"');
    expect(xml).toContain('<hr:DocumentID');
    expect(xml).toContain('<CandidateSupplier>');
    expect(xml).toContain('<CandidatePerson>');
    expect(xml).toContain('<CandidateProfile languageCode="en">');
    expect(xml).toContain('<RenderingInformation>');
  });

  it('renders PersonName with oa:GivenName and hr:FamilyName', async () => {
    const t = findTheme('europass', 'candidate')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<oa:GivenName>Jane</oa:GivenName>');
    expect(xml).toContain('<hr:FamilyName>Doe</hr:FamilyName>');
  });

  it('encodes phone, email, and address as Communication entries', async () => {
    const t = findTheme('europass', 'candidate')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<ChannelCode>Telephone</ChannelCode>');
    expect(xml).toContain('<CountryDialing>421</CountryDialing>');
    expect(xml).toContain('<oa:DialNumber>000000000</oa:DialNumber>');
    expect(xml).toContain('<ChannelCode>Email</ChannelCode>');
    expect(xml).toContain('<Text>j@x.com</Text>');
    expect(xml).toContain('<oa:AddressLine>Bratislava</oa:AddressLine>');
    expect(xml).toContain('<CountryCode>sk</CountryCode>');
  });

  it('emits EmploymentHistory with EmployerHistory/PositionHistory for work entries', async () => {
    const t = findTheme('europass', 'candidate')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<EmploymentHistory>');
    expect(xml).toContain('<OrganizationName languageID="en">Foo Inc</OrganizationName>');
    expect(xml).toContain('<PositionTitle>CTO</PositionTitle>');
    expect(xml).toContain('<StartDate>2022-01</StartDate>');
    expect(xml).toContain('<CurrentIndicator>true</CurrentIndicator>');
  });

  it('emits Skills bucketed into Communication/Organisational/ManagementAndLeadership/Digital containers', async () => {
    const t = findTheme('europass', 'candidate')!;
    const { bytes } = await t.render(cv(), {});
    const xml = new TextDecoder().decode(bytes);
    expect(xml).toContain('<CommunicationAndInterpersonalSkills>');
    expect(xml).toContain('speaking');
    expect(xml).toContain('<ManagementAndLeadershipSkills>');
    expect(xml).toContain('mentoring');
    expect(xml).toContain('<DigitalSkills>');
    expect(xml).toContain('TypeScript');
  });
});
