import type { FC } from 'hono/jsx';
import type { ExperienceEntry } from '../model.js';

export const ExperienceItem: FC<{ entry: ExperienceEntry }> = ({ entry }) => (
  <article class="cv-experience-item">
    <header>
      <h3 class="cv-role">{entry.title}</h3>
      <p class="cv-company">
        {entry.company}
        {entry.location ? <span class="cv-location-inline"> · {entry.location}</span> : null}
      </p>
      <p class="cv-dates">
        {entry.start} — {entry.end}
      </p>
    </header>
    {entry.bullets.length > 0 ? (
      <ul class="cv-bullets">
        {entry.bullets.map((html) => (
          <li dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </ul>
    ) : null}
  </article>
);
