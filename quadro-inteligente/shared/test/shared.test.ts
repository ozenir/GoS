import { test } from "node:test";
import assert from "node:assert/strict";
import { compileExpression, checkExpression } from "../src/mathExpr.ts";
import { toProviderJsonSchema } from "../src/jsonSchema.ts";
import { Analysis, LessonContent, type Step } from "../src/schema.ts";
import { validateSteps, sanitizeSteps, inlineMathParts } from "../src/validate.ts";

test("expressões: precedência, implícita, funções e constantes", () => {
  const f = compileExpression("2x^2 - 3*sin(pi/2) + |x - 4|");
  assert.equal(f(1), 2 - 3 + 3);
  assert.ok(Math.abs(compileExpression("e^x")(1) - Math.E) < 1e-12);
  assert.equal(compileExpression("-x^2")(3), -9);
  assert.equal(compileExpression("2^3^2")(0), 512);
  assert.equal(compileExpression("sqrt(x)/2")(16), 2);
  assert.equal(compileExpression("3(x+1)")(1), 6);
});

test("expressões: rejeita código arbitrário", () => {
  assert.notEqual(checkExpression("alert(1)"), null);
  assert.notEqual(checkExpression("x; process.exit()"), null);
  assert.notEqual(checkExpression("constructor"), null);
  assert.equal(checkExpression("ln(x) + log(x)"), null);
});

function walk(node: unknown, fn: (o: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, fn));
  else if (node && typeof node === "object") {
    fn(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, fn));
  }
}

test("JSON Schema compatível com saída estruturada", () => {
  for (const schema of [LessonContent, Analysis]) {
    const js = toProviderJsonSchema(schema);
    walk(js, (o) => {
      assert.ok(!("oneOf" in o), "sem oneOf");
      assert.ok(!("minItems" in o) && !("minLength" in o), "sem restrições de tamanho");
      if (o.type === "object" && o.properties) {
        assert.equal(o.additionalProperties, false);
        assert.deepEqual(o.required, Object.keys(o.properties as object));
      }
    });
  }
});

const baseStep = (over: Partial<Step>): Step => ({
  id: "s1", kind: "introduction", title: "T", goal: "", newPage: false, board: [], script: [], teacherNotes: "", studentQuestions: [], ...over,
});

test("validação semântica encontra problemas e o saneamento remove referências quebradas", () => {
  const steps: Step[] = [
    baseStep({
      board: [
        { id: "a", type: "text", variant: "body", content: "x", ink: "ink", align: "left" },
        { id: "a", type: "divider", ink: "ink" },
        { id: "c", type: "connector", from: "a", to: "zzz", ink: "red", style: "arrow", label: "" },
      ],
      script: [{ text: "oi", elements: ["a", "nao-existe"] }],
    }),
  ];
  const problems = validateSteps(steps);
  assert.ok(problems.some((p) => p.includes("duplicado")));
  assert.ok(problems.some((p) => p.includes("nao-existe")));
  assert.ok(problems.some((p) => p.includes("zzz")));
  const clean = sanitizeSteps(steps);
  assert.deepEqual(clean[0].script[0].elements, ["a"]);
  assert.equal(clean[0].board.some((e) => e.type === "connector"), false);
});

test("extrai LaTeX inline", () => {
  assert.deepEqual(inlineMathParts("a $x^2$ e $\\theta$"), ["x^2", "\\theta"]);
});
