/**
 * Persistência das aulas em SQLite (módulo nativo node:sqlite) e das
 * imagens no disco. A camada expõe um repositório simples, para que o
 * banco possa ser trocado (Postgres, etc.) sem alterar as rotas.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Analysis, Depth, LessonContent, LessonRecord, LessonStatus, LessonSummary } from "@qi/shared";
import { config } from "./config.ts";

fs.mkdirSync(path.join(config.dataDir, "images"), { recursive: true });
const db = new DatabaseSync(path.join(config.dataDir, "quadro.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL DEFAULT '',
    level TEXT NOT NULL DEFAULT '',
    depth TEXT NOT NULL DEFAULT 'intermediate',
    teacher_notes TEXT NOT NULL DEFAULT '',
    has_image INTEGER NOT NULL DEFAULT 0,
    analysis_json TEXT,
    content_json TEXT,
    error TEXT NOT NULL DEFAULT '',
    sample INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS lessons_updated ON lessons(updated_at DESC);
`);

type Row = Record<string, string | number | null>;

function toRecord(r: Row): LessonRecord {
  return {
    id: String(r.id),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    status: r.status as LessonStatus,
    title: String(r.title),
    subject: String(r.subject),
    topic: String(r.topic),
    level: String(r.level),
    depth: r.depth as Depth,
    teacherNotes: String(r.teacher_notes),
    hasImage: Boolean(r.has_image),
    analysis: r.analysis_json ? (JSON.parse(String(r.analysis_json)) as Analysis) : null,
    content: r.content_json ? (JSON.parse(String(r.content_json)) as LessonContent) : null,
    error: String(r.error),
    sample: Boolean(r.sample),
  };
}

export const lessons = {
  create(input: { subject: string; level: string; depth: Depth; teacherNotes: string; hasImage: boolean; sample?: boolean; id?: string }): LessonRecord {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO lessons (id, created_at, updated_at, status, subject, level, depth, teacher_notes, has_image, sample)
       VALUES (?, ?, ?, 'uploaded', ?, ?, ?, ?, ?, ?)`,
    ).run(id, now, now, input.subject, input.level, input.depth, input.teacherNotes, input.hasImage ? 1 : 0, input.sample ? 1 : 0);
    return this.get(id)!;
  },

  get(id: string): LessonRecord | null {
    const r = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as Row | undefined;
    return r ? toRecord(r) : null;
  },

  list(): LessonSummary[] {
    const rows = db.prepare("SELECT * FROM lessons ORDER BY sample ASC, updated_at DESC").all() as Row[];
    return rows.map((r) => {
      const { analysis: _a, content, ...rest } = toRecord(r);
      return { ...rest, stepCount: content?.steps.length ?? 0 };
    });
  },

  update(id: string, patch: Partial<Pick<LessonRecord, "status" | "title" | "subject" | "topic" | "level" | "depth" | "teacherNotes" | "analysis" | "content" | "error">>): LessonRecord {
    const cols: string[] = [];
    const vals: (string | number | null)[] = [];
    const map: Record<string, string> = {
      status: "status", title: "title", subject: "subject", topic: "topic", level: "level", depth: "depth",
      teacherNotes: "teacher_notes", error: "error",
    };
    for (const [k, v] of Object.entries(patch)) {
      if (k === "analysis" || k === "content") {
        cols.push(`${k === "analysis" ? "analysis_json" : "content_json"} = ?`);
        vals.push(v == null ? null : JSON.stringify(v));
      } else if (map[k]) {
        cols.push(`${map[k]} = ?`);
        vals.push(v as string);
      }
    }
    cols.push("updated_at = ?");
    vals.push(new Date().toISOString());
    db.prepare(`UPDATE lessons SET ${cols.join(", ")} WHERE id = ?`).run(...vals, id);
    return this.get(id)!;
  },

  remove(id: string) {
    db.prepare("DELETE FROM lessons WHERE id = ?").run(id);
    fs.rmSync(imagePath(id), { force: true });
  },
};

export function imagePath(id: string) {
  return path.join(config.dataDir, "images", `${id}.jpg`);
}
