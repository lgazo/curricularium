import type { FC } from 'hono/jsx';
import type { CV as CVData } from '../model.js';
import { Sidebar } from './Sidebar.js';
import { Main } from './Main.js';

export const CV: FC<{ cv: CVData }> = ({ cv }) => (
  <div class="cv-page">
    <Sidebar profile={cv.profile} skills={cv.skills} />
    <Main cv={cv} />
  </div>
);
