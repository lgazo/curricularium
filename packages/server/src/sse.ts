export type SSEEvent =
  | { event: 'reload'; data?: Record<string, unknown> }
  | { event: 'error'; data: { message: string; file?: string } };

type Client = {
  send: (event: SSEEvent) => void | Promise<void>;
};

const clients = new Set<Client>();

export function addClient(client: Client): () => void {
  clients.add(client);
  return () => clients.delete(client);
}

export function broadcast(message: SSEEvent): void {
  for (const client of clients) {
    try {
      void client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
