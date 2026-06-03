import { createServer, type ServerResponse } from "http";

const clients = new Set<ServerResponse>();

export function startSSE(port = 8787) {
  createServer((req, res) => {
    if (req.url !== "/feed") { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
      "Connection": "keep-alive", "Access-Control-Allow-Origin": "*",
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
  }).listen(port);
}

export function broadcast(event: unknown) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of clients) c.write(line);
}
