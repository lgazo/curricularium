/* @jsxRuntime automatic */
/* @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { Project } from '../../../../spec/model.js';
import { formatDateMMYYYY } from '../../../../spec/canonical.js';
import { splitBulletList } from './markdown.js';

export const ProjectItem: FC<{ entry: Project }> = ({ entry }) => {
  const bullets = splitBulletList(entry.body);
  const end = entry.periodEnd ? formatDateMMYYYY(entry.periodEnd) : 'Present';
  return (
    <article class="cv-experience-item">
      <header>
        <h3 class="cv-role">{entry.title}</h3>
        <p class="cv-company">
          {entry.employer}
          {entry.client ? <span class="cv-location-inline"> · {entry.client}</span> : null}
          {entry.location ? <span class="cv-location-inline"> · {entry.location}</span> : null}
        </p>
        <p class="cv-dates">{formatDateMMYYYY(entry.periodStart)} – {end}</p>
      </header>
      {bullets.length > 0 ? (
        <ul class="cv-bullets">
          {bullets.map((html) => (<li dangerouslySetInnerHTML={{ __html: html }} />))}
        </ul>
      ) : null}
    </article>
  );
};
