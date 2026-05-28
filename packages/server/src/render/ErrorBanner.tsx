import type { FC } from 'hono/jsx';
import type { ParseError } from '../model.js';

export const ErrorBanner: FC<{ errors: ParseError[] }> = ({ errors }) => (
  <div class="cv-error-banner" role="alert">
    <p class="cv-error-title">Could not render CV</p>
    <ul>
      {errors.map((e) => (
        <li>
          <code>{e.file}</code>
          {e.field ? <span class="cv-error-field"> · {e.field}</span> : null}
          <span class="cv-error-message"> — {e.message}</span>
        </li>
      ))}
    </ul>
  </div>
);
