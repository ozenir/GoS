import fs from "node:fs";
import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { ASSIST_ACTIONS, DEPTHS, LessonContent } from "@qi/shared";
import { AIError, getAI } from "./ai/index.ts";
import { config } from "./config.ts";
import { imagePath, lessons } from "./db.ts";
import { ImageError, normalizeImage } from "./images.ts";
import { analyze, assist, generate } from "./pedagogy/engine.ts";
import { openSse } from "./sse.ts";

export const api = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxBytes, files: 1, fields: 10, fieldSize: 20_000 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});

const ID = /^[A-Za-z0-9-]{8,64}$/;
function lessonOr404(req: Request, res: Response) {
  const id = String(req.params.id);
  const lesson = ID.test(id) ? lessons.get(id) : null;
  if (!lesson) res.status(404).json({ error: "Aula não encontrada." });
  return lesson;
}

/** Evita que a mesma aula seja processada duas vezes em paralelo. */
const running = new Set<string>();

api.get("/health", (_req, res) => {
  res.json({ ok: true, ai: { provider: getAI().name, model: getAI().model, configured: getAI().isConfigured() } });
});

api.get("/lessons", (_req, res) => {
  res.json(lessons.list());
});

const CreateBody = z.object({
  subject: z.string().max(80).default(""),
  level: z.string().max(120).default(""),
  depth: z.enum(DEPTHS).default("intermediate"),
  teacherNotes: z.string().max(2000).default(""),
  rotate: z.coerce.number().default(0),
});

api.post("/lessons", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Envie uma imagem JPG, JPEG, PNG ou WEBP." });
    return;
  }
  const body = CreateBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Dados do formulário inválidos." });
    return;
  }
  let image: Buffer;
  try {
    image = await normalizeImage(req.file.buffer, body.data.rotate);
  } catch (e) {
    res.status(400).json({ error: e instanceof ImageError ? e.message : "Não foi possível processar a imagem." });
    return;
  }
  const lesson = lessons.create({ ...body.data, hasImage: true });
  fs.writeFileSync(imagePath(lesson.id), image);
  res.status(201).json(lesson);
});

api.get("/lessons/:id", (req, res) => {
  const lesson = lessonOr404(req, res);
  if (lesson) res.json(lesson);
});

api.get("/lessons/:id/image", (req, res) => {
  const lesson = lessonOr404(req, res);
  if (!lesson) return;
  const p = imagePath(lesson.id);
  if (!fs.existsSync(p)) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=86400");
  fs.createReadStream(p).pipe(res);
});

const PatchBody = z.object({
  title: z.string().max(200).optional(),
  depth: z.enum(DEPTHS).optional(),
  level: z.string().max(120).optional(),
  teacherNotes: z.string().max(2000).optional(),
  content: LessonContent.optional(),
});

api.patch("/lessons/:id", (req, res) => {
  const lesson = lessonOr404(req, res);
  if (!lesson) return;
  const body = PatchBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }
  res.json(lessons.update(lesson.id, body.data));
});

api.delete("/lessons/:id", (req, res) => {
  const lesson = lessonOr404(req, res);
  if (!lesson) return;
  lessons.remove(lesson.id);
  res.status(204).end();
});

/** Executa uma operação longa de IA transmitindo o progresso por SSE. */
async function streamJob(req: Request, res: Response, id: string, job: (emit: ReturnType<typeof openSse>["send"], signal: AbortSignal) => Promise<unknown>) {
  if (running.has(id)) {
    res.status(409).json({ error: "Esta aula já está sendo processada. Aguarde." });
    return;
  }
  if (!getAI().isConfigured()) {
    res.status(503).json({ error: "A IA não está configurada no servidor. Defina ANTHROPIC_API_KEY em server/.env e reinicie." });
    return;
  }
  running.add(id);
  const sse = openSse(res);
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  try {
    await job(sse.send, controller.signal);
    sse.send({ type: "done", lesson: lessons.get(id)! });
  } catch (err) {
    const e = err instanceof AIError ? err : new AIError("Erro inesperado no servidor.", "unknown", true);
    if (e.code !== "aborted") console.error(`[job ${id}]`, e.code, e.message, e.details ?? "");
    sse.send({ type: "error", message: e.message, retryable: e.retryable });
  } finally {
    running.delete(id);
    sse.end();
  }
}

const AnalyzeBody = z.object({ corrections: z.string().max(6000).default("") });

api.post("/lessons/:id/analyze", async (req, res) => {
  const lesson = lessonOr404(req, res);
  if (!lesson) return;
  const body = AnalyzeBody.safeParse(req.body ?? {});
  const corrections = body.success ? body.data.corrections : "";
  await streamJob(req, res, lesson.id, (emit, signal) => analyze(lesson.id, corrections, emit, signal));
});

api.post("/lessons/:id/generate", async (req, res) => {
  const lesson = lessonOr404(req, res);
  if (!lesson) return;
  await streamJob(req, res, lesson.id, (emit, signal) => generate(lesson.id, emit, signal));
});

const AssistBody = z.object({ stepId: z.string().min(1).max(100), action: z.enum(ASSIST_ACTIONS) });

api.post("/lessons/:id/assist", async (req, res) => {
  const lesson = lessonOr404(req, res);
  if (!lesson) return;
  const body = AssistBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Ação inválida." });
    return;
  }
  await streamJob(req, res, lesson.id, (emit, signal) => assist(lesson.id, body.data.stepId, body.data.action, emit, signal));
});

api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? `A imagem excede ${Math.round(config.upload.maxBytes / 1024 / 1024)} MB.` : "Falha no envio do arquivo.";
    res.status(400).json({ error: msg });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});
