import type { FC } from 'hono/jsx';
import type { SpecCV } from '../../../../spec/model.js';
import { SECTION_HEADINGS, summaryHeading } from '../../../../spec/canonical.js';
import { renderMarkdown } from './markdown.js';
import { ExperienceItem } from './ExperienceItem.js';
import { EducationItem } from './EducationItem.js';
import { ProjectItem } from './ProjectItem.js';

export const Main: FC<{ cv: SpecCV }> = ({ cv }) => {
  const order = cv.variant.sectionOrder.filter((s) => s !== 'personal');

  return (
    <main class="cv-main">
      {order.map((section) => {
        switch (section) {
          case 'identity':
            if (!cv.identity.about) return null;
            return (
              <section class="cv-about">
                <h2 class="cv-section-title">{summaryHeading(cv.variant.summaryMode)}</h2>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(cv.identity.about.body) }} />
              </section>
            );
          case 'work-experience':
            if (cv.workExperience.length === 0) return null;
            return (
              <section class="cv-experience">
                <h2 class="cv-section-title">{SECTION_HEADINGS['work-experience']}</h2>
                {cv.workExperience.map((e) => <ExperienceItem entry={e} />)}
              </section>
            );
          case 'project': {
            const hasProjects = cv.projects.length > 0;
            const collapseOS = cv.variant.collapseOpenSource && cv.openSource.length > 0;
            if (!hasProjects && !collapseOS) return null;
            return (
              <section class="cv-projects">
                <h2 class="cv-section-title">{SECTION_HEADINGS['project']}</h2>
                {cv.projects.map((e) => <ProjectItem entry={e} />)}
                {collapseOS
                  ? cv.openSource.map((o) => (
                      <article class="cv-experience-item">
                        <header>
                          <h3 class="cv-role">{o.title}</h3>
                          <p class="cv-company"><a href={o.repoUrl}>{o.repoUrl}</a> · {o.role}</p>
                        </header>
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(o.body) }} />
                      </article>
                    ))
                  : null}
              </section>
            );
          }
          case 'education':
            if (cv.education.length === 0) return null;
            return (
              <section class="cv-education">
                <h2 class="cv-section-title">{SECTION_HEADINGS['education']}</h2>
                {cv.education.map((e) => <EducationItem entry={e} />)}
              </section>
            );
          case 'community':
            if (cv.community.length === 0) return null;
            return (
              <section class="cv-community">
                <h2 class="cv-section-title">{SECTION_HEADINGS['community']}</h2>
                {cv.community.map((c) => (
                  <article class="cv-experience-item">
                    <header>
                      <h3 class="cv-role">{c.role}</h3>
                      <p class="cv-company">{c.organisation}</p>
                    </header>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }} />
                  </article>
                ))}
              </section>
            );
          case 'open-source':
            if (cv.variant.collapseOpenSource || cv.openSource.length === 0) return null;
            return (
              <section class="cv-opensource">
                <h2 class="cv-section-title">{SECTION_HEADINGS['open-source']}</h2>
                {cv.openSource.map((o) => (
                  <article class="cv-experience-item">
                    <header>
                      <h3 class="cv-role">{o.title}</h3>
                      <p class="cv-company"><a href={o.repoUrl}>{o.repoUrl}</a> · {o.role}</p>
                    </header>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(o.body) }} />
                  </article>
                ))}
              </section>
            );
          case 'award':
            if (cv.awards.length === 0) return null;
            return (
              <section class="cv-awards">
                <h2 class="cv-section-title">{SECTION_HEADINGS['award']}</h2>
                <ul>{cv.awards.map((a) => <li><strong>{a.title}</strong> · {a.awarder} · {a.date}</li>)}</ul>
              </section>
            );
          case 'publication':
            if (cv.publications.length === 0) return null;
            return (
              <section class="cv-publications">
                <h2 class="cv-section-title">{SECTION_HEADINGS['publication']}</h2>
                <ul>{cv.publications.map((p) => <li><strong>{p.title}</strong> · {p.publisher} · {p.date}</li>)}</ul>
              </section>
            );
          case 'language':
            if (!cv.languages || cv.languages.languages.length === 0) return null;
            return (
              <section class="cv-languages">
                <h2 class="cv-section-title">{SECTION_HEADINGS['language']}</h2>
                <ul>{cv.languages.languages.map((l) => <li>{l.name} · {l.level}</li>)}</ul>
              </section>
            );
          case 'skill':
          default:
            return null;
        }
      })}
    </main>
  );
};
