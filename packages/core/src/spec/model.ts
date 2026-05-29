export type YearMonth = `${number}-${number}`;
export type Year = `${number}`;
export type DateLike = YearMonth | Year | 'present';

export type LangCode = string;
export type LocationStr = string;

export type SectionType =
  | 'personal' | 'identity' | 'work-experience' | 'project'
  | 'skill' | 'education' | 'community' | 'open-source'
  | 'award' | 'publication' | 'language';

export type Profile = { network: string; url: string; username: string | null };

export type AtomBase = {
  name: string;
  source: string | null;
  order: number;
  lang: LangCode;
  variantRationale?: string;
};

export type WorkExperience = AtomBase & {
  type: 'work-experience';
  employer: string;
  position: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  location: LocationStr;
  url: string | null;
  skills: string[];
  keywords: string[];
  refProjects: string[];
  teamSize: number | null;
  reportLine: string | null;
  body: string;
};

export type Project = AtomBase & {
  type: 'project';
  title: string;
  client: string | null;
  employer: string;
  parentExperience: string | null;
  periodStart: DateLike;
  periodEnd: DateLike | null;
  location: LocationStr | null;
  sector: string;
  roles: string[];
  tech: string[];
  url: string | null;
  keywords: string[];
  body: string;
};

export type Education = AtomBase & {
  type: 'education';
  institution: string;
  location: LocationStr;
  degree: string;
  field: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  honours: string | null;
  url: string | null;
  body: string;
};

export type Community = AtomBase & {
  type: 'community';
  organisation: string;
  role: string;
  periodStart: DateLike;
  periodEnd: DateLike;
  location: LocationStr | null;
  url: string | null;
  body: string;
};

export type OpenSource = AtomBase & {
  type: 'open-source';
  title: string;
  repoUrl: string;
  role: 'author' | 'maintainer' | 'contributor';
  periodStart: DateLike;
  periodEnd: DateLike;
  tech: string[];
  keywords: string[];
  body: string;
};

export type Award = AtomBase & {
  type: 'award';
  title: string;
  awarder: string;
  date: DateLike;
  url: string | null;
  body: string;
};

export type Publication = AtomBase & {
  type: 'publication';
  title: string;
  publisher: string;
  date: DateLike;
  url: string | null;
  authors: string[];
  body: string;
};

export type SkillGroup = {
  name: string;
  items: string[];
  level: string | null;
  europassBucket?: 'JobRelated' | 'Digital' | 'Communication' | 'Organisational';
};

export type Skills = AtomBase & {
  type: 'skill';
  groups: SkillGroup[];
  body: string;
};

export type Language = {
  code: LangCode;
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
  detail: string | null;
};

export type Languages = AtomBase & {
  type: 'language';
  languages: Language[];
  body: string;
};

export type Personal = AtomBase & {
  type: 'personal';
  fullName: string;
  targetRole: string;
  email: string;
  phone: string | null;
  location: LocationStr;
  profiles: Profile[];
  body: string;
};

export type IdentityHeadline = AtomBase & { type: 'identity'; subtype: 'headline'; body: string };
export type IdentityAbout = AtomBase & { type: 'identity'; subtype: 'about'; body: string };

export type VariantManifest = {
  type: 'variant';
  name: string;
  title: string;
  targetRole: string;
  sectionOrder: SectionType[];
  lang: LangCode;
  sourceMaster: string;
  outputTargets: string[];
  summaryMode: 'summary' | 'objective';
  collapseOpenSource: boolean;
  body: string;
};

export type SpecCV = {
  variantRoot: string;
  variant: VariantManifest;
  personal: Personal | null;
  identity: { headline: IdentityHeadline | null; about: IdentityAbout | null };
  workExperience: WorkExperience[];
  projects: Project[];
  education: Education[];
  community: Community[];
  openSource: OpenSource[];
  awards: Award[];
  publications: Publication[];
  skills: Skills | null;
  languages: Languages | null;
};

export type WarningCategory =
  | 'schema' | 'unknown-field' | 'visibility' | 'date'
  | 'body-h1' | 'action-verb' | 'acronym' | 'banned-string'
  | 'cross-atom' | 'identity-missing' | 'multi-singleton' | 'render-mapping';

export type LoadWarning = {
  file: string;
  field?: string;
  message: string;
  category: WarningCategory;
};
