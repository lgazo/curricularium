import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { addClient } from '../sse.js';

export const eventRoutes = new Hono();

eventRoutes.get('/events', (c) => {
  return streamSSE(c, async (s) => {
    const detach = addClient({
      send: (e) =>
        s.writeSSE({ event: e.event, data: JSON.stringify(e.data ?? {}) }),
    });

    const interval = setInterval(
      () => void s.writeSSE({ event: 'ping', data: '' }),
      25_000,
    );

    s.onAbort(() => {
      clearInterval(interval);
      detach();
    });

    await new Promise<void>(() => {});
  });
});
