import type { FC } from 'hono/jsx';
import type { EducationEntry } from '../model.js';

export const EducationItem: FC<{ entry: EducationEntry }> = ({ entry }) => (
  <article class="cv-education-item">
    <header>
      <h3 class="cv-degree">
        {entry.degree}
        {entry.field ? <span> · {entry.field}</span> : null}
      </h3>
      <p class="cv-school">{entry.school}</p>
      <p class="cv-dates">
        {entry.start} — {entry.end}
      </p>
    </header>
    {entry.notes ? <div class="cv-notes" dangerouslySetInnerHTML={{ __html: entry.notes }} /> : null}
  </article>
);
