// Quadro de investigação: as provas citadas na fala caem num mural, presas por
// alfinete ou fita, ligadas por fio vermelho; a câmera viaja de pista em pista.
// Tudo é função pura do quadro (frame) atual, como o Remotion exige.
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type ProvaT = {
  tipo: "foto" | "icone" | "nota" | "placar" | "etiqueta" | "alcance";
  img?: string | null;
  rotulo: string;
  detalhe?: string;
  carimbo?: string;
  cor?: "ouro" | "verde" | "vermelho" | "azul" | "amarelo";
  riscar?: boolean;
  gatilho?: string; // palavra da fala que faz a prova aparecer
  liga?: number | null; // índice, dentro da mesma cena, da prova ligada pelo fio; padrão: a anterior; null = sem fio
  pos?: [number, number]; // posição manual, relativa ao centro do grupo da cena
  // tipo "alcance": círculos do campeão (img) até cada distância, sobre um quadro do jogo (fundo)
  fundo?: string | null;
  alcances?: { valor: number; rotulo: string; cor?: keyof typeof CORES }[];
};

export type VideoFundoT = { url: string; dur?: number } | null;

type CenaQ = {
  inicio: number;
  fim: number;
  palavras: { texto: string; inicio: number; fim: number }[];
  provas?: ProvaT[];
  videoFundo?: VideoFundoT; // vídeo da habilidade atrás do quadro durante a cena
};

const CORES = {
  ouro: "#C8AA6E",
  verde: "#2ECC71",
  vermelho: "#E53935",
  azul: "#3FA9F5",
  amarelo: "#FFD54F",
};
const FIO = "#C62828";
const PAPEL = "#F2EEE4";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\w%+/]/g, "");

const TAM: Record<ProvaT["tipo"], [number, number]> = {
  foto: [470, 560],
  icone: [430, 470],
  nota: [470, 300],
  placar: [700, 420],
  etiqueta: [520, 120],
  alcance: [820, 960],
};

// arranjos dentro de um grupo (cena), por quantidade de provas
const ARRANJOS: [number, number][][] = [
  [[0, 0]],
  [[-250, -150], [260, 170]],
  [[-280, -300], [290, -230], [0, 300]],
  [[-270, -330], [280, -300], [-260, 330], [290, 360]],
  [[-300, -420], [300, -380], [0, 40], [-300, 470], [300, 500]],
  [[-300, -520], [300, -480], [-300, 0], [300, 40], [-300, 520], [300, 560]],
];

// cena com prova de alcance (cartão grande): ele fica no centro e as outras provas
// se empilham à esquerda e à direita, sem cobrir os círculos
function layoutComAlcance(provas: ProvaT[]): [number, number][] | null {
  const ia = provas.findIndex((p) => p.tipo === "alcance");
  if (ia < 0) return null;
  const [wa] = TAM.alcance;
  const out: [number, number][] = provas.map(() => [0, 0]);
  const y = [-430, -430];
  let lado = 0;
  provas.forEach((p, k) => {
    if (k === ia) return;
    const [w, h] = TAM[p.tipo] || TAM.nota;
    const sinal = lado === 0 ? -1 : 1;
    out[k] = [sinal * (wa / 2 + 30 + w / 2), y[lado] + h / 2];
    y[lado] += h + 40;
    lado = 1 - lado;
  });
  return out;
}

type Colocada = ProvaT & {
  i: number;
  cena: number;
  x: number;
  y: number;
  rot: number;
  w: number;
  h: number;
  t: number; // segundo em que aparece
  fixa: "alfinete" | "fita";
};

export function montarQuadro(cenas: CenaQ[]) {
  const lista: Colocada[] = [];
  let ultimo = -1;
  // empilha os grupos pelo tamanho real de cada um, sem sobrepor
  const posDe = (provas: ProvaT[]) => {
    const auto = layoutComAlcance(provas);
    if (auto) return provas.map((p, k) => p.pos || auto[k]);
    const arr = ARRANJOS[Math.min(Math.max(provas.length, 1), ARRANJOS.length) - 1];
    return provas.map((p, k) => p.pos || arr[k % arr.length] || [0, 0]);
  };
  const centros: number[] = [];
  let baseAnterior = 0;
  cenas.forEach((c, ci) => {
    const provas = c.provas || [];
    const ps = posDe(provas);
    const topo = provas.length ? -Math.min(...provas.map((p, k) => ps[k][1] - (TAM[p.tipo] || TAM.nota)[1] / 2)) : 0;
    const base = provas.length ? Math.max(...provas.map((p, k) => ps[k][1] + (TAM[p.tipo] || TAM.nota)[1] / 2)) : 0;
    centros[ci] = ci === 0 ? 1000 : centros[ci - 1] + baseAnterior + topo + 520;
    if (provas.length) baseAnterior = base;
  });
  cenas.forEach((c, ci) => {
    const provas = c.provas || [];
    if (!provas.length) return;
    const cx = 1300 + (ci % 2 === 0 ? -360 : 360);
    const cy = centros[ci];
    const arr = ARRANJOS[Math.min(provas.length, ARRANJOS.length) - 1];
    const auto = layoutComAlcance(provas);
    let cursor = c.inicio;
    const inicioCena = lista.length;
    provas.forEach((p, k) => {
      const [w, h] = TAM[p.tipo] || TAM.nota;
      const base = p.pos || auto?.[k] || arr[k % arr.length] || [0, 0];
      const jx = (random(`jx${ci}-${k}`) - 0.5) * 70;
      const jy = (random(`jy${ci}-${k}`) - 0.5) * 70;
      // quando aparece: na palavra-gatilho; senão, espalhado pela cena
      let t = c.inicio + ((k + 0.25) / provas.length) * Math.max(0.5, c.fim - c.inicio) * 0.9;
      if (p.gatilho) {
        const g = norm(p.gatilho);
        const w0 = c.palavras.find((w) => w.inicio >= cursor - 0.05 && norm(w.texto).startsWith(g));
        if (w0) t = Math.max(c.inicio, w0.inicio - 0.12);
      }
      t = Math.max(t, cursor);
      cursor = t + 0.25;
      const i = lista.length;
      lista.push({
        ...p,
        i,
        cena: ci,
        x: cx + base[0] + (p.pos ? 0 : jx),
        y: cy + base[1] + (p.pos ? 0 : jy),
        rot: (random(`r${ci}-${k}`) - 0.5) * (p.tipo === "placar" ? 4 : p.tipo === "etiqueta" ? 5 : 13),
        w,
        h,
        t,
        fixa: random(`f${ci}-${k}`) > 0.72 ? "fita" : "alfinete",
        liga: p.liga === undefined ? (ultimo >= 0 ? ultimo : null) : p.liga === null ? null : inicioCena + p.liga,
      });
      ultimo = i;
    });
  });
  return lista;
}

const EASE = Easing.bezier(0.65, 0, 0.25, 1);

type Cam = { x: number; y: number; z: number };
const lerp = (a: Cam, b: Cam, p: number): Cam => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: a.z + (b.z - a.z) * p });

function enquadrar(cartas: Colocada[], larg: number, alt: number): Cam {
  const x0 = Math.min(...cartas.map((o) => o.x - o.w / 2));
  const x1 = Math.max(...cartas.map((o) => o.x + o.w / 2));
  const y0 = Math.min(...cartas.map((o) => o.y - o.h / 2));
  const y1 = Math.max(...cartas.map((o) => o.y + o.h / 2));
  const z = Math.min(1.15, (larg * 0.92) / (x1 - x0 + 60), (alt * 0.58) / (y1 - y0 + 60));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z };
}

// câmera em dois tempos: chega perto da prova nova e depois recua para mostrar o grupo
function camera(lista: Colocada[], t: number, larg: number, alt: number): Cam {
  if (!lista.length) return { x: 1300, y: 1000, z: 1 };
  const foco = (c: Colocada): Cam => ({ x: c.x, y: c.y, z: Math.min(1.4, (larg * 0.64) / c.w, (alt * 0.46) / c.h) });
  const grupo = (c: Colocada): Cam => {
    const vis = lista.filter((o) => o.cena === c.cena && o.t <= c.t + 0.01);
    const tudo = enquadrar(vis, larg, alt);
    return tudo.z >= 0.78 ? tudo : enquadrar(vis.slice(-4), larg, alt);
  };
  const estado = (k: number, tt: number): Cam => {
    if (k < 0) {
      const g = grupo(lista[0]);
      return { ...g, z: g.z * 0.85 };
    }
    const c = lista[k];
    const de = estado(k - 1, c.t);
    const mudouCena = k > 0 && lista[k - 1].cena !== c.cena;
    const d1 = mudouCena ? 0.8 : 0.5;
    const p1 = EASE(Math.min(1, Math.max(0, (tt - c.t) / d1)));
    const recuo = mudouCena ? Math.sin(p1 * Math.PI) * 0.25 : 0;
    const a = lerp(de, foco(c), p1);
    a.z *= 1 - recuo;
    const p2 = EASE(Math.min(1, Math.max(0, (tt - c.t - 0.95) / 1.1)));
    return p2 > 0 ? lerp(a, grupo(c), p2) : a;
  };
  let k = -1;
  for (let i = 0; i < lista.length; i++) if (lista[i].t <= t) k = i;
  return estado(k, t);
}

function tremor(lista: Colocada[], t: number) {
  // pancada do carimbo: um tranco curto na câmera
  let dx = 0;
  let dy = 0;
  for (const c of lista) {
    if (!c.carimbo) continue;
    const d = t - (c.t + 0.5);
    if (d >= 0 && d < 0.3) {
      const a = (1 - d / 0.3) * 14;
      dx += Math.sin(d * 90) * a;
      dy += Math.cos(d * 70) * a * 0.6;
    }
  }
  return { dx, dy };
}

// ---------------------------------------------------------------- peças

const Alfinete: React.FC<{ s: number; cor: string }> = ({ s, cor }) => (
  <div
    style={{
      position: "absolute",
      top: -22,
      left: "50%",
      width: 44,
      height: 44,
      marginLeft: -22,
      borderRadius: "50%",
      background: `radial-gradient(circle at 35% 30%, #fff8 0 12%, ${cor} 30%, #5a0d0d 100%)`,
      boxShadow: "4px 8px 8px rgba(0,0,0,.55)",
      transform: `scale(${s})`,
      zIndex: 3,
    }}
  />
);

const Fita: React.FC<{ s: number; rot: number }> = ({ s, rot }) => (
  <div
    style={{
      position: "absolute",
      top: -26,
      left: "50%",
      width: 170,
      height: 54,
      marginLeft: -85,
      background: "rgba(235,225,190,.78)",
      boxShadow: "0 2px 4px rgba(0,0,0,.25)",
      transform: `rotate(${rot}deg) scaleX(${s})`,
      zIndex: 3,
    }}
  />
);

const Carimbo: React.FC<{ texto: string; cor: string; local: number }> = ({ texto, cor, local }) => {
  const p = Math.min(1, Math.max(0, local / 5));
  if (local < 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "64%",
        transform: `translate(-50%,-50%) rotate(-13deg) scale(${interpolate(p, [0, 1], [2.6, 1])})`,
        opacity: p,
        border: `8px double ${cor}`,
        color: cor,
        padding: "6px 22px",
        fontFamily: "'Special Elite', 'Courier New', monospace",
        fontSize: 64,
        letterSpacing: 4,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        background: "rgba(255,255,255,.06)",
        mixBlendMode: "multiply",
        zIndex: 4,
        textShadow: `0 0 1px ${cor}`,
      }}
    >
      {texto}
    </div>
  );
};

const Risco: React.FC<{ local: number; w: number; h: number }> = ({ local, w, h }) => {
  if (local < 0) return null;
  const a = Math.min(1, local / 7);
  const b = Math.min(1, Math.max(0, (local - 6) / 7));
  const len = Math.hypot(w, h);
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, zIndex: 4, overflow: "visible" }}>
      {[
        [30, 30, w - 30, h - 30, a],
        [w - 30, 40, 40, h - 40, b],
      ].map(([x1, y1, x2, y2, p], k) => (
        <line
          key={k}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#E53935"
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - (p as number))}
          opacity={0.92}
        />
      ))}
    </svg>
  );
};

// Alcance ilustrativo: o campeão no centro de um quadro do jogo e um círculo por distância,
// em escala entre si (o maior encosta na borda). Os anéis crescem e o número conta até o valor.
const SEQ_CORES: (keyof typeof CORES)[] = ["azul", "vermelho", "verde", "amarelo", "ouro"];
const CartaoAlcance: React.FC<{ c: Colocada; estilo: React.CSSProperties; fixacao: React.ReactNode; local: number; cor: string }> = ({
  c,
  estilo,
  fixacao,
  local,
  cor,
}) => {
  const lado = c.w - 48;
  const meio = lado / 2;
  const lista = (c.alcances || []).filter((a) => a && a.valor > 0);
  const max = Math.max(1, ...lista.map((a) => a.valor));
  const R = meio - 34;
  const ordem = lista.map((a, i) => ({ ...a, i, cor: CORES[a.cor || SEQ_CORES[i % SEQ_CORES.length]] }));
  return (
    <div style={{ ...estilo, background: "#0b1220", border: `6px solid ${cor}`, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      {fixacao}
      <div style={{ position: "relative", width: lado, height: lado, overflow: "hidden", background: "#16251a" }}>
        {c.fundo ? (
          <Img src={c.fundo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.62) saturate(1.1)" }} />
        ) : null}
        <svg width={lado} height={lado} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id={`brilho${c.i}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[...ordem].sort((a, b) => b.valor - a.valor).map((a) => {
            const p = interpolate(local, [8 + a.i * 14, 30 + a.i * 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            const r = (a.valor / max) * R * p;
            const ang = (-40 - a.i * 38) * (Math.PI / 180);
            return (
              <g key={a.i} opacity={p > 0 ? 1 : 0}>
                <circle cx={meio} cy={meio} r={r} fill={`${a.cor}1f`} stroke={a.cor} strokeWidth={7} filter={`url(#brilho${c.i})`} />
                <line x1={meio} y1={meio} x2={meio + Math.cos(ang) * r} y2={meio + Math.sin(ang) * r} stroke={a.cor} strokeWidth={4} strokeDasharray="14 10" />
              </g>
            );
          })}
        </svg>
        {ordem.map((a) => {
          const p = interpolate(local, [8 + a.i * 14, 30 + a.i * 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          if (p <= 0) return null;
          const r = (a.valor / max) * R * p;
          const ang = (-40 - a.i * 38) * (Math.PI / 180);
          return (
            <div
              key={a.i}
              style={{
                position: "absolute",
                left: meio + Math.cos(ang) * r,
                top: meio + Math.sin(ang) * r,
                transform: "translate(-50%,-50%)",
                background: "rgba(5,10,18,.85)",
                border: `3px solid ${a.cor}`,
                borderRadius: 10,
                padding: "2px 14px",
                fontFamily: "Anton, Impact, sans-serif",
                fontSize: 46,
                color: "white",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              {Math.round(a.valor * p)}
            </div>
          );
        })}
        {c.img ? (
          <Img
            src={c.img}
            style={{
              position: "absolute",
              left: meio - 62,
              top: meio - 62,
              width: 124,
              height: 124,
              borderRadius: "50%",
              border: `6px solid ${cor}`,
              boxShadow: `0 0 26px ${cor}aa`,
              objectFit: "cover",
            }}
          />
        ) : null}
        <div style={{ position: "absolute", left: 18, top: 14, fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 38, color: "white", textTransform: "uppercase", textShadow: "0 3px 10px #000" }}>
          {c.rotulo}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ordem.map((a) => (
          <div key={a.i} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 30, color: "#e9e4d6" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: a.cor, boxShadow: `0 0 10px ${a.cor}`, flex: "none" }} />
            <span>
              {a.rotulo}: <b style={{ color: a.cor }}>{a.valor}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Cartao: React.FC<{ c: Colocada; local: number; fps: number; foco: boolean; antigo: boolean }> = ({
  c,
  local,
  fps,
  foco,
  antigo,
}) => {
  const queda = spring({ frame: local, fps, config: { damping: 12, mass: 0.9 } });
  const fix = spring({ frame: local - 8, fps, config: { damping: 9 } });
  const cor = CORES[c.cor || "ouro"];
  const revela = interpolate(local, [0, 26], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const escrita = Math.floor(interpolate(local, [6, 30], [0, (c.detalhe || "").length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sombra = interpolate(queda, [0, 1], [60, 14]);
  const estilo: React.CSSProperties = {
    position: "absolute",
    left: c.x - c.w / 2,
    top: c.y - c.h / 2,
    width: c.w,
    height: c.h,
    transform: `translateY(${interpolate(queda, [0, 1], [-90, 0])}px) rotate(${c.rot + (1 - queda) * 14}deg) scale(${interpolate(queda, [0, 1], [1.35, 1]) * (foco ? 1.04 : 1)})`,
    opacity: Math.min(1, local / 4),
    filter: antigo ? "saturate(.45) brightness(.8)" : undefined,
    boxShadow: `${sombra * 0.4}px ${sombra}px ${sombra * 1.4}px rgba(0,0,0,.6)`,
    zIndex: foco ? 2 : 1,
  };
  const fixacao = c.fixa === "fita" ? <Fita s={fix} rot={c.rot * -0.6} /> : <Alfinete s={fix} cor={FIO} />;
  const marcador: React.CSSProperties = { fontFamily: "'Permanent Marker', 'Comic Sans MS', cursive" };
  const maquina: React.CSSProperties = { fontFamily: "'Special Elite', 'Courier New', monospace" };

  let corpo: React.ReactNode = null;
  if (c.tipo === "foto") {
    corpo = (
      <div style={{ ...estilo, background: PAPEL, padding: "24px 24px 0" }}>
        {fixacao}
        <div style={{ width: "100%", height: c.w - 48, overflow: "hidden", background: "#111" }}>
          {c.img ? (
            <Img
              src={c.img}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "50% 18%",
                filter: `brightness(${1 + revela * 1.6}) sepia(${revela}) contrast(${1 - revela * 0.3})`,
              }}
            />
          ) : null}
        </div>
        <div style={{ ...marcador, color: "#1b1b1b", fontSize: 44, textAlign: "center", paddingTop: 14, lineHeight: 1.05 }}>
          {c.rotulo}
        </div>
      </div>
    );
  } else if (c.tipo === "icone") {
    corpo = (
      <div
        style={{
          ...estilo,
          background: "#0d1a2b",
          border: `5px solid ${cor}`,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {fixacao}
        {c.img ? <Img src={c.img} style={{ width: 190, height: 190, border: `4px solid ${cor}`, boxShadow: `0 0 30px ${cor}66` }} /> : null}
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "white", fontSize: 40, textAlign: "center", lineHeight: 1.05, textTransform: "uppercase" }}>
          {c.rotulo}
        </div>
        {c.detalhe ? (
          <div style={{ ...maquina, color: cor, fontSize: 30, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.25 }}>
            {c.detalhe.slice(0, escrita)}
          </div>
        ) : null}
      </div>
    );
  } else if (c.tipo === "placar") {
    const nums = (c.rotulo.match(/\d+/g) || []).map(Number);
    const p = interpolate(local, [4, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    const texto = nums.length ? nums.map((n) => Math.round(n * p)).join(" / ") : c.rotulo;
    corpo = (
      <div
        style={{
          ...estilo,
          background: "linear-gradient(160deg,#141c2b,#05080e)",
          border: `6px solid ${cor}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {fixacao}
        <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 170, color: cor, lineHeight: 1, textShadow: `0 0 40px ${cor}88` }}>{texto}</div>
        {c.detalhe ? (
          <div style={{ ...maquina, fontSize: 32, color: "#e9e4d6", textAlign: "center", whiteSpace: "pre-line" }}>{c.detalhe.slice(0, escrita)}</div>
        ) : null}
      </div>
    );
  } else if (c.tipo === "alcance") {
    corpo = <CartaoAlcance c={c} estilo={estilo} fixacao={fixacao} local={local} cor={cor} />;
  } else if (c.tipo === "etiqueta") {
    corpo = (
      <div
        style={{
          ...estilo,
          background: PAPEL,
          borderLeft: `22px solid ${cor}`,
          display: "flex",
          alignItems: "center",
          padding: "0 26px",
          boxShadow: `${sombra * 0.3}px ${sombra * 0.6}px ${sombra}px rgba(0,0,0,.5)`,
        }}
      >
        {c.fixa === "fita" ? <Fita s={fix} rot={c.rot * -0.6} /> : null}
        <div style={{ ...marcador, fontSize: c.rotulo.length > 24 ? 34 : 42, color: c.cor === "verde" ? "#1e8e4f" : c.cor === "vermelho" ? "#c62828" : "#1b1b1b", lineHeight: 1.05 }}>
          {c.rotulo}
        </div>
      </div>
    );
  } else {
    const amarelo = c.cor === "amarelo";
    corpo = (
      <div
        style={{
          ...estilo,
          background: amarelo ? "#FFE57A" : PAPEL,
          borderTop: amarelo ? undefined : `16px solid ${cor}`,
          padding: "26px 30px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 10,
          backgroundImage: amarelo ? undefined : "repeating-linear-gradient(180deg, transparent 0 47px, #9fb6d633 47px 49px)",
        }}
      >
        {fixacao}
        <div style={{ ...marcador, fontSize: 48, color: c.cor === "verde" ? "#1e8e4f" : c.cor === "vermelho" ? "#c62828" : "#1b1b1b", lineHeight: 1.05 }}>
          {c.rotulo}
        </div>
        {c.detalhe ? (
          <div style={{ ...maquina, fontSize: 30, color: "#2a2a2a", whiteSpace: "pre-line", lineHeight: 1.3 }}>{c.detalhe.slice(0, escrita)}</div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {corpo}
      {c.riscar || c.carimbo ? (
        <div
          style={{
            position: "absolute",
            left: c.x - c.w / 2,
            top: c.y - c.h / 2,
            width: c.w,
            height: c.h,
            transform: `rotate(${c.rot}deg)`,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {c.riscar ? <Risco local={local - 12} w={c.w} h={c.h} /> : null}
          {c.carimbo ? <Carimbo texto={c.carimbo} cor={c.cor === "verde" ? "#1f9d55" : "#D32F2F"} local={local - 15} /> : null}
        </div>
      ) : null}
    </>
  );
};

const Fios: React.FC<{ lista: Colocada[]; t: number; fps: number }> = ({ lista, t, fps }) => {
  const xs = lista.map((c) => c.x);
  const ys = lista.map((c) => c.y);
  const minX = Math.min(...xs) - 600;
  const minY = Math.min(...ys) - 600;
  const w = Math.max(...xs) - minX + 600;
  const h = Math.max(...ys) - minY + 600;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: minX, top: minY, overflow: "visible", zIndex: 0 }}>
      {lista.map((c) => {
        if (c.liga == null || !lista[c.liga] || t < c.t) return null;
        const a = lista[c.liga];
        const x1 = a.x - minX;
        const y1 = a.y - a.h / 2 + 2 - minY;
        const x2 = c.x - minX;
        const y2 = c.y - c.h / 2 + 2 - minY;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const mx = (x1 + x2) / 2 + Math.sin(t * 1.3 + c.i) * 8;
        const my = (y1 + y2) / 2 + dist * 0.16;
        const comprimento = dist * 1.12;
        const p = Math.min(1, Math.max(0, ((t - c.t) * fps) / 16));
        return (
          <g key={c.i}>
            <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} stroke="rgba(0,0,0,.45)" strokeWidth={7} fill="none" transform="translate(5,9)" strokeDasharray={comprimento} strokeDashoffset={comprimento * (1 - p)} />
            <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} stroke={FIO} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={comprimento} strokeDashoffset={comprimento * (1 - p)} />
          </g>
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------- quadro

export const Quadro: React.FC<{ cenas: CenaQ[]; cor1: string; cor2: string }> = ({ cenas, cor1, cor2 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const lista = useMemo(() => montarQuadro(cenas), [cenas]);

  const [h] = useState(() => delayRender("fontes do quadro"));
  useEffect(() => {
    Promise.all([
      document.fonts.load("48px 'Permanent Marker'"),
      document.fonts.load("30px 'Special Elite'"),
      document.fonts.load("170px Anton"),
    ])
      .catch(() => undefined)
      .finally(() => continueRender(h));
  }, [h]);

  const cam = camera(lista, t, width, height);
  const { dx, dy } = tremor(lista, t);
  const deriva = { x: Math.sin(t * 0.7) * 10, y: Math.sin(t * 0.5 + 1) * 12, r: Math.sin(t * 0.33) * 0.5 };
  const z = cam.z;
  const tx = width / 2 - cam.x * z + dx + deriva.x;
  const ty = height * 0.4 - cam.y * z + dy + deriva.y;

  let focoIdx = -1;
  for (const c of lista) if (c.t <= t) focoIdx = c.i;
  const cenaFoco = focoIdx >= 0 ? lista[focoIdx].cena : 0;

  // vídeo da habilidade atrás do quadro: o mural fica translúcido enquanto ele aparece
  const fade = (c: CenaQ) =>
    c.videoFundo?.url
      ? Math.min(
          interpolate(t, [c.inicio - 0.2, c.inicio + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          interpolate(t, [c.fim + 0.1, c.fim + 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        )
      : 0;
  const vis = Math.max(0, ...cenas.map(fade));

  return (
    <AbsoluteFill style={{ backgroundColor: cor1, overflow: "hidden" }}>
      {cenas.map((c, i) =>
        c.videoFundo?.url ? (
          <Sequence key={`vf${i}`} from={Math.max(0, Math.round((c.inicio - 0.2) * fps))} durationInFrames={Math.max(1, Math.round((c.fim - c.inicio + 0.8) * fps))} layout="none">
            <AbsoluteFill style={{ opacity: fade(c) }}>
              <Loop durationInFrames={Math.max(15, Math.round((c.videoFundo.dur || 4) * fps) - 2)}>
                <OffthreadVideo src={c.videoFundo.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Loop>
              <AbsoluteFill style={{ background: "rgba(2,6,12,.28)" }} />
            </AbsoluteFill>
          </Sequence>
        ) : null,
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${z}) rotate(${deriva.r}deg)`,
        }}
      >
        {/* mural: feltro escuro com grade de mapa e granulado */}
        <div
          style={{
            position: "absolute",
            opacity: 1 - vis * 0.72,
            left: -1200,
            top: -1400,
            width: 5000,
            height: Math.max(6000, cenas.length * 2600 + 4000),
            background: `radial-gradient(1200px 900px at 1300px 900px, ${cor2}, transparent 70%),
              repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 2px, transparent 2px 120px),
              repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 2px, transparent 2px 120px),
              radial-gradient(circle at 20% 30%, rgba(255,255,255,.05) 0 1px, transparent 2px) 0 0/9px 9px,
              ${cor1}`,
          }}
        />
        <Fios lista={lista} t={t} fps={fps} />
        {lista.map((c) =>
          t >= c.t ? (
            <Cartao
              key={c.i}
              c={c}
              local={Math.round((t - c.t) * fps)}
              fps={fps}
              foco={c.i === focoIdx}
              antigo={c.cena < cenaFoco - 0}
            />
          ) : null,
        )}
      </div>
      {/* luz de luminária: holofote na prova em foco, bordas escuras */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 40%, transparent 0%, transparent 50%, rgba(0,0,0,.5) 100%)`,
          pointerEvents: "none",
        }}
      />
      {/* faixa escura embaixo para a legenda ler bem */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, transparent 0%, transparent 62%, rgba(0,0,0,.45) 76%, rgba(0,0,0,.6) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
