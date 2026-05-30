/* @jsxRuntime automatic */
/* @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { Education } from '../../../../spec/model.js';
import { formatDateMMYYYY } from '../../../../spec/canonical.js';
import { renderMarkdown } from './markdown.js';

export const EducationItem: FC<{ entry: Education }> = ({ entry }) => (
  <article class="cv-education-item">
    <header>
      <h3 class="cv-degree">
        {entry.degree}
        {entry.field ? <span> · {entry.field}</span> : null}
      </h3>
      <p class="cv-school">{entry.institution} · {entry.location}</p>
      <p class="cv-dates">
        {formatDateMMYYYY(entry.periodStart)} – {formatDateMMYYYY(entry.periodEnd)}
      </p>
    </header>
    {entry.body ? <div class="cv-notes" dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.body) }} /> : null}
  </article>
);
