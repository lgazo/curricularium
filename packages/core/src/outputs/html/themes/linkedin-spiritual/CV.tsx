/* @jsxRuntime automatic */
/* @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { SpecCV } from '../../../../spec/model.js';
import { Sidebar } from './Sidebar.js';
import { Main } from './Main.js';

export const CV: FC<{ cv: SpecCV }> = ({ cv }) => (
  <div class="cv-page">
    <Sidebar
      personal={cv.personal}
      skills={cv.skills}
      headline={cv.identity.headline?.body.trim() ?? null}
    />
    <Main cv={cv} />
  </div>
);
