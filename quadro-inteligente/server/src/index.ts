import fs from "node:fs";
import path from "node:path";
import express from "express";
import { config } from "./config.ts";
import { api } from "./routes.ts";
import { seedSamples } from "./samples/seed.ts";
import { getAI } from "./ai/index.ts";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

// Limite simples de requisições por IP para as rotas de IA.
const hits = new Map<string, { n: number; t: number }>();
app.use("/api/lessons/:id/:op", (req, res, next) => {
  if (req.method !== "POST") return next();
  const key = req.ip ?? "?";
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > 60_000) hits.set(key, { n: 1, t: now });
  else if (++h.n > 20) {
    res.status(429).json({ error: "Muitas solicitações em sequência. Aguarde um minuto." });
    return;
  }
  next();
});

app.use("/api", express.json({ limit: "2mb" }), api);

if (fs.existsSync(path.join(config.staticDir, "index.html"))) {
  app.use(express.static(config.staticDir, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(config.staticDir, "index.html")));
}

seedSamples();

app.listen(config.port, config.host, () => {
  console.log(`Quadro Inteligente — API em http://${config.host}:${config.port}`);
  console.log(`IA: ${getAI().name} / ${getAI().model} — ${getAI().isConfigured() ? "configurada" : "NÃO configurada (defina ANTHROPIC_API_KEY em server/.env)"}`);
});
