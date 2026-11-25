import type { Response } from "express";
import type { ProgressEvent } from "@qi/shared";

/** Abre um fluxo Server-Sent Events e devolve uma função para emitir eventos. */
export function openSse(res: Response) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);
  let closed = false;
  res.on("close", () => { closed = true; clearInterval(heartbeat); });
  return {
    send(ev: ProgressEvent) {
      if (!closed) res.write(`data: ${JSON.stringify(ev)}\n\n`);
    },
    end() {
      clearInterval(heartbeat);
      if (!closed) res.end();
    },
    get closed() { return closed; },
  };
}
