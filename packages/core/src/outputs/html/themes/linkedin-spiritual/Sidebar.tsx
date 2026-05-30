/* @jsxRuntime automatic */
/* @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { Personal, Skills } from '../../../../spec/model.js';

type Props = { personal: Personal | null; skills: Skills | null; headline: string | null };

export const Sidebar: FC<Props> = ({ personal, skills, headline }) => {
  if (!personal) return <aside class="cv-sidebar" />;
  return (
    <aside class="cv-sidebar">
      <h1 class="cv-name">{personal.fullName}</h1>
      {headline ? <p class="cv-headline">{headline}</p> : null}
      <p class="cv-location">{personal.location}</p>

      <section class="cv-contact">
        <h2 class="cv-section-label">Contact</h2>
        <ul>
          <li><a href={`mailto:${personal.email}`}>{personal.email}</a></li>
          {personal.phone ? <li>{personal.phone}</li> : null}
          {personal.profiles.map((p) => (
            <li><a href={p.url}>{p.network}{p.username ? `: ${p.username}` : ''}</a></li>
          ))}
        </ul>
      </section>

      {skills && skills.groups.length > 0 ? (
        <section class="cv-skills">
          <h2 class="cv-section-label">Skills</h2>
          {skills.groups.map((group) => (
            <div class="cv-skill-group">
              <h3 class="cv-skill-group-name">{group.name}</h3>
              <ul class="cv-chips">
                {group.items.map((item) => (<li class="cv-chip">{item}</li>))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
  );
};
