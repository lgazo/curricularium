import type { FC } from 'hono/jsx';
import type { CV } from '../model.js';
import { ExperienceItem } from './ExperienceItem.js';
import { EducationItem } from './EducationItem.js';

export const Main: FC<{ cv: CV }> = ({ cv }) => (
  <main class="cv-main">
    {cv.about ? (
      <section class="cv-about">
        <h2 class="cv-section-title">About</h2>
        <div dangerouslySetInnerHTML={{ __html: cv.about }} />
      </section>
    ) : null}

    {cv.experience.length > 0 ? (
      <section class="cv-experience">
        <h2 class="cv-section-title">Experience</h2>
        {cv.experience.map((entry) => (
          <ExperienceItem entry={entry} />
        ))}
      </section>
    ) : null}

    {cv.education.length > 0 ? (
      <section class="cv-education">
        <h2 class="cv-section-title">Education</h2>
        {cv.education.map((entry) => (
          <EducationItem entry={entry} />
        ))}
      </section>
    ) : null}
  </main>
);
