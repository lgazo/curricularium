import type { FC } from 'hono/jsx';
import type { Profile, SkillsGroup } from '../model.js';

type Props = { profile: Profile; skills: SkillsGroup[] };

export const Sidebar: FC<Props> = ({ profile, skills }) => {
  const { contact } = profile;
  return (
    <aside class="cv-sidebar">
      {profile.photo ? (
        <img
          class="cv-photo"
          src={`/source-asset/${encodeURI(profile.photo)}`}
          alt={profile.name}
        />
      ) : (
        <div class="cv-photo cv-photo--placeholder" aria-hidden="true" />
      )}
      <h1 class="cv-name">{profile.name}</h1>
      <p class="cv-headline">{profile.headline}</p>
      {profile.location ? <p class="cv-location">{profile.location}</p> : null}

      <section class="cv-contact">
        <h2 class="cv-section-label">Contact</h2>
        <ul>
          {contact.email ? <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li> : null}
          {contact.phone ? <li>{contact.phone}</li> : null}
          {contact.website ? <li><a href={contact.website}>{contact.website}</a></li> : null}
          {contact.linkedin ? <li>LinkedIn: {contact.linkedin}</li> : null}
          {contact.github ? <li>GitHub: {contact.github}</li> : null}
        </ul>
      </section>

      {skills.length > 0 ? (
        <section class="cv-skills">
          <h2 class="cv-section-label">Skills</h2>
          {skills.map((group) => (
            <div class="cv-skill-group">
              {group.group ? <h3 class="cv-skill-group-name">{group.group}</h3> : null}
              <ul class="cv-chips">
                {group.items.map((item) => (
                  <li class="cv-chip">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
  );
};
