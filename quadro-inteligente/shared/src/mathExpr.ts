/**
 * Avaliador seguro de expressões matemáticas em uma variável (x).
 *
 * Usado pelos gráficos cartesianos. A IA descreve funções como texto
 * ("2*sin(x) + x^2"); aqui elas são analisadas por um parser próprio,
 * sem `eval`/`new Function`, garantindo que nenhum código arbitrário seja
 * executado no navegador.
 */

type Node =
  | { t: "num"; v: number }
  | { t: "var" }
  | { t: "neg"; a: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { t: "call"; fn: string; args: Node[] };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2, exp: Math.exp,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  min: Math.min, max: Math.max, pow: Math.pow,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

interface Tok { k: "num" | "id" | "op" | "(" | ")" | "," | "|"; v: string }

function tokenize(src: string): Tok[] {
  const s = src.replace(/\*\*/g, "^").replace(/π/g, "pi").replace(/·|×/g, "*").replace(/−/g, "-");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
      if (!m) throw new Error(`Número inválido em "${s.slice(i, i + 8)}"`);
      out.push({ k: "num", v: m[0] }); i += m[0].length; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const m = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(s.slice(i))!;
      out.push({ k: "id", v: m[0].toLowerCase() }); i += m[0].length; continue;
    }
    if ("+-*/^".includes(c)) { out.push({ k: "op", v: c }); i++; continue; }
    if (c === "(" || c === "[" || c === "{") { out.push({ k: "(", v: "(" }); i++; continue; }
    if (c === ")" || c === "]" || c === "}") { out.push({ k: ")", v: ")" }); i++; continue; }
    if (c === ",") { out.push({ k: ",", v: "," }); i++; continue; }
    if (c === "|") { out.push({ k: "|", v: "|" }); i++; continue; }
    throw new Error(`Caractere não permitido: "${c}"`);
  }
  return out;
}

class Parser {
  private i = 0;
  constructor(private toks: Tok[]) {}
  private peek() { return this.toks[this.i]; }
  private next() { return this.toks[this.i++]; }
  private expect(k: Tok["k"]) {
    const t = this.next();
    if (!t || t.k !== k) throw new Error(`Esperado "${k}"`);
    return t;
  }
  parse(): Node {
    const n = this.expr();
    if (this.i < this.toks.length) throw new Error(`Símbolo inesperado: "${this.peek().v}"`);
    return n;
  }
  private expr(): Node {
    let a = this.term();
    for (let t = this.peek(); t && t.k === "op" && (t.v === "+" || t.v === "-"); t = this.peek()) {
      this.next();
      a = { t: "bin", op: t.v as "+" | "-", a, b: this.term() };
    }
    return a;
  }
  private term(): Node {
    let a = this.unary();
    for (;;) {
      const t = this.peek();
      if (t && t.k === "op" && (t.v === "*" || t.v === "/")) {
        this.next();
        a = { t: "bin", op: t.v as "*" | "/", a, b: this.unary() };
      } else if (t && (t.k === "num" || t.k === "id" || t.k === "(")) {
        a = { t: "bin", op: "*", a, b: this.power() }; // multiplicação implícita: 2x, 3sin(x)
      } else return a;
    }
  }
  private unary(): Node {
    const t = this.peek();
    if (t && t.k === "op" && (t.v === "-" || t.v === "+")) {
      this.next();
      const a = this.unary();
      return t.v === "-" ? { t: "neg", a } : a;
    }
    return this.power();
  }
  private power(): Node {
    const base = this.primary();
    const t = this.peek();
    if (t && t.k === "op" && t.v === "^") {
      this.next();
      return { t: "bin", op: "^", a: base, b: this.unary() };
    }
    return base;
  }
  private primary(): Node {
    const t = this.next();
    if (!t) throw new Error("Expressão incompleta");
    if (t.k === "num") return { t: "num", v: Number(t.v) };
    if (t.k === "(") { const n = this.expr(); this.expect(")"); return n; }
    if (t.k === "|") { const n = this.expr(); this.expect("|"); return { t: "call", fn: "abs", args: [n] }; }
    if (t.k === "id") {
      if (t.v === "x") return { t: "var" };
      if (Object.hasOwn(CONSTS, t.v)) return { t: "num", v: CONSTS[t.v] };
      if (Object.hasOwn(FUNCS, t.v)) {
        const nx = this.peek();
        if (nx && nx.k === "(") {
          this.next();
          const args: Node[] = [this.expr()];
          while (this.peek()?.k === ",") { this.next(); args.push(this.expr()); }
          this.expect(")");
          return { t: "call", fn: t.v, args };
        }
        // sin x  → sin(x) (argumento sem parênteses)
        return { t: "call", fn: t.v, args: [this.power()] };
      }
      throw new Error(`Identificador desconhecido: "${t.v}"`);
    }
    throw new Error(`Símbolo inesperado: "${t.v}"`);
  }
}

function evalNode(n: Node, x: number): number {
  switch (n.t) {
    case "num": return n.v;
    case "var": return x;
    case "neg": return -evalNode(n.a, x);
    case "bin": {
      const a = evalNode(n.a, x), b = evalNode(n.b, x);
      switch (n.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "^": return Math.pow(a, b);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "call": return FUNCS[n.fn](...n.args.map((a) => evalNode(a, x)));
  }
}

export type CompiledFn = (x: number) => number;

/** Compila uma expressão em função de x. Lança Error com mensagem em português se inválida. */
export function compileExpression(src: string): CompiledFn {
  const ast = new Parser(tokenize(src)).parse();
  return (x: number) => evalNode(ast, x);
}

/** Retorna null se a expressão é válida, ou a mensagem de erro. */
export function checkExpression(src: string): string | null {
  try {
    compileExpression(src)(0.5);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
