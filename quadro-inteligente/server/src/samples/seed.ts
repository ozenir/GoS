import { LessonContent, validateLesson } from "@qi/shared";
import { lessons } from "../db.ts";
import { checkLatex } from "../pedagogy/latex.ts";
import { PENDULUM_LESSON } from "./pendulum.ts";

const SAMPLES = [{ id: "exemplo-pendulo-simples", content: PENDULUM_LESSON }];

/** Registra (ou atualiza) as aulas de exemplo empacotadas com o sistema. */
export function seedSamples() {
  for (const s of SAMPLES) {
    const content = LessonContent.parse(s.content);
    const problems = validateLesson(content, checkLatex);
    if (problems.length) console.warn(`[samples] ${s.id}:`, problems);
    if (!lessons.get(s.id)) {
      lessons.create({ id: s.id, subject: content.plan.subject, level: content.plan.level, depth: "intermediate", teacherNotes: "", hasImage: false, sample: true });
    }
    lessons.update(s.id, { status: "ready", content, title: content.plan.title, topic: content.plan.topic, subject: content.plan.subject, level: content.plan.level });
  }
}
