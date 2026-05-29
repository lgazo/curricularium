import type { FC } from 'hono/jsx';
import type { WorkExperience } from '../../../../spec/model.js';
import { formatDateMMYYYY } from '../../../../spec/canonical.js';
import { renderMarkdown, splitBulletList } from './markdown.js';

export const ExperienceItem: FC<{ entry: WorkExperience }> = ({ entry }) => {
  const bullets = splitBulletList(entry.body);
  return (
    <article class="cv-experience-item">
      <header>
        <h3 class="cv-role">{entry.position}</h3>
        <p class="cv-company">
          {entry.employer}
          <span class="cv-location-inline"> · {entry.location}</span>
        </p>
        <p class="cv-dates">
          {formatDateMMYYYY(entry.periodStart)} – {formatDateMMYYYY(entry.periodEnd)}
        </p>
      </header>
      {bullets.length > 0 ? (
        <ul class="cv-bullets">
          {bullets.map((html) => (<li dangerouslySetInnerHTML={{ __html: html }} />))}
        </ul>
      ) : null}
    </article>
  );
};
