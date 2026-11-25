import type { AssistAction, Depth, LessonRecord, LessonSummary, ProgressEvent } from "@qi/shared";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error ?? `Erro ${res.status}`, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface Health { ok: boolean; ai: { provider: string; model: string; configured: boolean } }

export const api = {
  health: () => fetch("/api/health").then((r) => json<Health>(r)),
  list: () => fetch("/api/lessons").then((r) => json<LessonSummary[]>(r)),
  get: (id: string) => fetch(`/api/lessons/${encodeURIComponent(id)}`).then((r) => json<LessonRecord>(r)),
  remove: (id: string) => fetch(`/api/lessons/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) => json<void>(r)),
  patch: (id: string, body: Partial<Pick<LessonRecord, "title" | "depth" | "level" | "teacherNotes">>) =>
    fetch(`/api/lessons/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => json<LessonRecord>(r)),
  create: (input: { image: Blob; subject: string; level: string; depth: Depth; teacherNotes: string; rotate: number }) => {
    const fd = new FormData();
    fd.append("subject", input.subject);
    fd.append("level", input.level);
    fd.append("depth", input.depth);
    fd.append("teacherNotes", input.teacherNotes);
    fd.append("rotate", String(input.rotate));
    fd.append("image", input.image, "questao");
    return fetch("/api/lessons", { method: "POST", body: fd }).then((r) => json<LessonRecord>(r));
  },
  imageUrl: (id: string) => `/api/lessons/${encodeURIComponent(id)}/image`,
  analyze: (id: string, corrections: string, onEvent: (e: ProgressEvent) => void, signal?: AbortSignal) =>
    streamPost(`/api/lessons/${encodeURIComponent(id)}/analyze`, { corrections }, onEvent, signal),
  generate: (id: string, onEvent: (e: ProgressEvent) => void, signal?: AbortSignal) =>
    streamPost(`/api/lessons/${encodeURIComponent(id)}/generate`, {}, onEvent, signal),
  assist: (id: string, stepId: string, action: AssistAction, onEvent: (e: ProgressEvent) => void, signal?: AbortSignal) =>
    streamPost(`/api/lessons/${encodeURIComponent(id)}/assist`, { stepId, action }, onEvent, signal),
};

/** POST com resposta em Server-Sent Events. Resolve com o evento final (done/error). */
async function streamPost(url: string, body: unknown, onEvent: (e: ProgressEvent) => void, signal?: AbortSignal): Promise<ProgressEvent> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Não foi possível conectar ao servidor. Verifique se ele está em execução.", 0);
  }
  if (!res.ok || !res.body) await json(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: ProgressEvent | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim()) as ProgressEvent;
          if (ev.type === "done" || ev.type === "error") final = ev;
          onEvent(ev);
        } catch {
          /* linha inválida: ignora */
        }
      }
    }
  }
  if (!final) throw new ApiError("A conexão com o servidor foi interrompida antes do fim. Tente novamente.", 0);
  return final;
}
