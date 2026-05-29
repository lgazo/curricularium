import type { FC } from 'hono/jsx';
import type { LoadWarning } from '@curricularium/core';

export const WarningsBanner: FC<{ warnings: LoadWarning[] }> = ({ warnings }) => {
  if (warnings.length === 0) return <div id="warnings-banner" />;
  return (
    <details id="warnings-banner" class="cv-warnings-banner">
      <summary>{`Warnings (${warnings.length})`}</summary>
      <ul>
        {warnings.map((w) => (
          <li>
            <span class={`cv-warn cv-warn--${w.category}`}>{w.category}</span>{' '}
            <code>{w.file}</code>
            {w.field ? <span class="cv-warn-field"> · {w.field}</span> : null}
            <span class="cv-warn-message"> — {w.message}</span>
          </li>
        ))}
      </ul>
    </details>
  );
};
