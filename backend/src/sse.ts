import { createServer, type ServerResponse } from "http";

const clients = new Set<ServerResponse>();

export function startSSE(port = 8787) {
  const server = createServer((req, res) => {
    if (req.url !== "/feed") { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
      "Connection": "keep-alive", "Access-Control-Allow-Origin": "*",
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
  });
  // SSE is the non-critical live-demo feed. A port conflict (e.g. another agent
  // on the same box) must NOT take down the inscribe/resolve loop, so we log
  // and continue rather than crash.
  server.on("error", (e: NodeJS.ErrnoException) => {
    console.error(`[sse] feed disabled: ${e.code === "EADDRINUSE" ? `port ${port} already in use` : e.message}`);
  });
  server.listen(port);
}

export function broadcast(event: unknown) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of clients) {
    try {
      if (!c.writableEnded) c.write(line);
      else clients.delete(c);
    } catch {
      clients.delete(c);
    }
  }
}
