// Estúdio Shorts — interface do painel (JS puro, sem build).
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtMB = (b) => `${(b / 1048576).toFixed(1)} MB`;
const urlArq = (rel) => (rel ? "/arquivos/" + rel.split("/").map(encodeURIComponent).join("/") : null);
const clone = (o) => JSON.parse(JSON.stringify(o));

const TIPOS = ["Outplay / Jogada", "Dica / Tutorial", "Build / Guia de campeão", "Curiosidade / Lore",
  "Notícia de patch", "Tier list / Ranking", "Humor / Fail", "Polêmica / Opinião"];
const TONS = ["Energético", "Engraçado", "Sério / Analítico", "Misterioso", "Polêmico"];
const PUBLICOS = ["Todos", "Iniciantes (Ferro–Prata)", "Intermediário (Ouro–Esmeralda)", "High elo (Diamante+)"];
const PRESETS = {
  Hextech: { tema: { cor1: "#010A13", cor2: "#0A323C", corDestaque: "#C8AA6E" }, cores: { corFalada: "#FFE600", corEnfase: "#0AC8B9" } },
  Noxus: { tema: { cor1: "#120404", cor2: "#4A0C0C", corDestaque: "#E8403A" }, cores: { corFalada: "#FFD400", corEnfase: "#FF4D4D" } },
  Ionia: { tema: { cor1: "#12061A", cor2: "#4A1A4F", corDestaque: "#FF8FD8" }, cores: { corFalada: "#FFE600", corEnfase: "#FF8FD8" } },
  Shurima: { tema: { cor1: "#140D02", cor2: "#5A3B0C", corDestaque: "#FFC845" }, cores: { corFalada: "#FFC845", corEnfase: "#4FD1FF" } },
  Piltover: { tema: { cor1: "#0B0F14", cor2: "#1D3B4F", corDestaque: "#F2A93B" }, cores: { corFalada: "#F2A93B", corEnfase: "#3FD0FF" } },
  Clean: { tema: { cor1: "#0A0A0A", cor2: "#2A2A2A", corDestaque: "#FFFFFF" }, cores: { corFalada: "#22FF88", corEnfase: "#22D3FF" } },
};

let estado = { projetos: [], brutos: [], musicas: [], vozes: [], etapas: [] };
let proj = null; // projeto aberto (resposta de GET /api/projetos/:id)
let aba = "briefing";
let playerMontado = false;
let cfg = null; // cópia editável da config
let ot = null; // cópia editável do roteiro

async function api(metodo, url, corpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo instanceof Blob ? {} : { "content-type": "application/json" },
    body: corpo === undefined ? undefined : corpo instanceof Blob ? corpo : JSON.stringify(corpo),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro || r.statusText);
  return j;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 2600);
}

const debounce = (fn, ms) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

// ---------------------------------------------------------------- player

function propsLocais() {
  if (!proj) return window.EstudioPlayer.exemplo;
  const p = clone(proj.props);
  p.estilo = cfg.estilo;
  p.efeitos = cfg.efeitos;
  p.tema = cfg.tema;
  p.fundo = { ...cfg.fundo, url: cfg.fundo.tipo === "video" ? urlArq(cfg.fundo.arquivo) : null };
  p.musica = { url: urlArq(cfg.musica.arquivo), volume: cfg.musica.volume };
  p.hook = { texto: ot?.hook?.textoTela ?? p.hook.texto, duracao: cfg.hookDuracao };
  p.cta = { texto: ot?.cta?.texto ?? p.cta.texto, ativo: cfg.ctaAtivo };
  return p;
}

function atualizarPlayer() {
  const props = propsLocais();
  if (!playerMontado) {
    window.EstudioPlayer.montar($("#player"), props);
    playerMontado = true;
  } else window.EstudioPlayer.atualizar(props);
  const d = props.trilha.duracao;
  $("#dicaPlayer").innerHTML = proj
    ? `${fmtT(d)} · ${proj.narracaoAtual ? "com narração" : "tempo estimado (sem narração ainda)"} · ${props.trilha.cenas.length} cenas`
    : "Exemplo — crie um vídeo para ver o seu aqui";
}

// ---------------------------------------------------------------- estrutura

async function carregarEstado() {
  estado = await api("GET", "/api/estado");
  const sel = $("#seletor");
  sel.innerHTML =
    `<option value="">— escolha um vídeo —</option>` +
    estado.projetos.map((p) => `<option value="${p.id}">${esc(p.titulo || p.id)} · ${esc(nomeEtapa(p.etapa))}</option>`).join("");
  if (proj) sel.value = proj.id;
}

const nomeEtapa = (e) => estado.etapas.find((x) => x[0] === e)?.[1] || e || "";

async function abrir(id, novaAba) {
  proj = await api("GET", `/api/projetos/${id}`);
  cfg = clone(proj.config);
  ot = clone(proj.otimizado || { cenas: proj.cenas });
  if (!ot.cenas?.length) ot.cenas = clone(proj.cenas);
  assinatura = "";
  history.replaceState(null, "", `#${id}`);
  $("#seletor").value = id;
  if (novaAba) aba = novaAba;
  else if (!proj.otimizado && proj.status.etapa !== "aguardando_claude") aba = "briefing";
  desenharTudo();
}

function desenharTudo() {
  desenharEtapas();
  desenharAba();
  desenharStatus();
  atualizarPlayer();
}

function desenharEtapas() {
  const ordem = ["briefing", "otimizacao", "roteiro", "visual", "exportar"];
  const e = proj?.status?.etapa;
  const feitas = {
    briefing: !!proj,
    otimizacao: !!proj?.otimizado?.mudancas,
    roteiro: !!proj?.narracaoAtual,
    visual: !!proj?.narracaoAtual,
    exportar: (proj?.renders || []).length > 0,
  };
  document.querySelectorAll("#etapas button").forEach((b) => {
    const a = b.dataset.aba;
    b.classList.toggle("ativo", a === aba);
    b.classList.toggle("feito", !!feitas[a] && a !== aba);
    b.disabled = !proj && a !== "briefing";
  });
  void ordem, e;
}

function desenharStatus() {
  if (!proj) {
    $("#status").innerHTML = `<div class="etq"><b>Nenhum vídeo aberto</b></div>`;
    $("#linha").innerHTML = `<li>Mande um roteiro para começar.</li>`;
    return;
  }
  const s = proj.status;
  const classe = { erro: "erro", aguardando_claude: "claude", pronto: "ok", narrado: "ok", otimizado: "ok", narrando: "rodando", renderizando: "rodando" }[s.etapa] || "";
  const prog = s.progresso != null ? `<div class="barra"><div style="width:${Math.round(s.progresso * 100)}%"></div></div><small>${esc(s.progressoTexto || "")}</small>` : "";
  $("#status").innerHTML = `<div class="etq"><b>${esc(proj.briefing.titulo || proj.id)}</b><span class="selo ${classe}">${esc(nomeEtapa(s.etapa))}</span></div>${prog}`;
  $("#linha").innerHTML = [...(s.log || [])]
    .reverse()
    .map((l) => `<li class="${l.tipo}">${esc(l.msg)}<small>${new Date(l.t).toLocaleString("pt-BR")}</small></li>`)
    .join("");
}

function desenharAba() {
  const fn = { briefing: abaBriefing, otimizacao: abaOtimizacao, roteiro: abaRoteiro, visual: abaVisual, exportar: abaExportar }[aba];
  $("#conteudo").innerHTML = "";
  fn($("#conteudo"));
}

// ---------------------------------------------------------------- 1. briefing

function abaBriefing(el) {
  const b = proj?.briefing || {};
  const opt = (lista, v) => lista.map((x) => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("");
  el.innerHTML = `
  <div class="cartao destaque">
    <h2>${proj ? "Briefing do vídeo" : "Novo vídeo"}</h2>
    <p style="color:var(--suave);margin-top:0">Cole o roteiro e diga o que você quer. Depois o Claude revisa e otimiza com base no que viraliza em Shorts de League of Legends.</p>
    <label>Título / ideia do vídeo</label>
    <input type="text" id="bTitulo" value="${esc(b.titulo)}" placeholder="Ex.: Build de Jinx que ninguém usa" />
    <div class="linha2">
      <div><label>Tipo de vídeo</label><select id="bTipo">${opt(TIPOS, b.tipo)}</select></div>
      <div><label>Campeão(ões)</label><input type="text" id="bCampeao" value="${esc(b.campeao)}" placeholder="Ex.: Jinx, Thresh" /></div>
      <div><label>Duração alvo</label><select id="bDuracao">${opt(["15s", "30s", "45s", "60s"], b.duracao || "30s")}</select></div>
      <div><label>Tom</label><select id="bTom">${opt(TONS, b.tom)}</select></div>
      <div><label>Público</label><select id="bPublico">${opt(PUBLICOS, b.publico)}</select></div>
    </div>
    <label>Roteiro (texto que vai ser narrado)</label>
    <textarea class="grande" id="bRoteiro" placeholder="Escreva ou cole o roteiro aqui…">${esc(b.roteiro)}</textarea>
    <label>Orientações para o Claude (opcional)</label>
    <textarea id="bOrient" placeholder="Ex.: quero tom de zoeira, mencionar o patch 26.22, terminar perguntando qual o main da galera…">${esc(b.orientacoes)}</textarea>
    <div class="acoes">
      <button class="btn ouro" id="bEnviar">✦ Salvar e enviar para o Claude otimizar</button>
      <button class="btn" id="bSalvar">Só salvar</button>
    </div>
  </div>`;
  const ler = () => ({
    titulo: $("#bTitulo").value.trim(),
    tipo: $("#bTipo").value,
    campeao: $("#bCampeao").value.trim(),
    duracao: $("#bDuracao").value,
    tom: $("#bTom").value,
    publico: $("#bPublico").value,
    roteiro: $("#bRoteiro").value,
    orientacoes: $("#bOrient").value,
  });
  const salvar = async () => {
    const dados = ler();
    if (!dados.roteiro.trim()) throw new Error("Escreva o roteiro primeiro");
    if (proj) await api("PUT", `/api/projetos/${proj.id}/briefing`, dados);
    else {
      const { id } = await api("POST", "/api/projetos", dados);
      await carregarEstado();
      await abrir(id, "briefing");
    }
  };
  $("#bSalvar").onclick = () => salvar().then(() => toast("Briefing salvo")).catch((e) => toast(e.message));
  $("#bEnviar").onclick = async () => {
    try {
      await salvar();
      await api("POST", `/api/projetos/${proj.id}/pedir-otimizacao`);
      await abrir(proj.id, "otimizacao");
      toast("Enviado! O Claude vai otimizar o roteiro.");
    } catch (e) {
      toast(e.message);
    }
  };
}

// ---------------------------------------------------------------- 2. otimização

function abaOtimizacao(el) {
  const o = proj.otimizado;
  const esperando = proj.status.etapa === "aguardando_claude";
  if (esperando || !o?.mudancas) {
    el.innerHTML = `
    <div class="cartao destaque">
      <h2>Otimização do roteiro</h2>
      ${esperando
        ? `<div class="esperando"><div class="pulso"></div><div><b>O Claude está revisando o seu roteiro…</b><br><span style="color:var(--suave)">Ele analisa gancho, ritmo, retenção e final com base nos Shorts de LoL que viralizam, e devolve a versão otimizada com o porquê de cada mudança. Esta página atualiza sozinha.<br>Se demorar, escreva <b>“otimiza o roteiro”</b> no chat do Claude Code.</span></div></div>`
        : `<p>Este vídeo ainda não foi otimizado.</p><div class="acoes"><button class="btn ouro" id="oPedir">✦ Enviar para o Claude otimizar</button></div>`}
    </div>
    <div class="cartao"><h3>Roteiro original</h3><p style="white-space:pre-wrap">${esc(proj.briefing.roteiro)}</p></div>`;
    $("#oPedir")?.addEventListener("click", async () => {
      await api("POST", `/api/projetos/${proj.id}/pedir-otimizacao`);
      await abrir(proj.id, "otimizacao");
    });
    return;
  }
  el.innerHTML = `
  <div class="cartao destaque">
    <h2>Roteiro otimizado</h2>
    <div class="notas">
      <div class="nota antes"><small>Original</small><b>${o.notaOriginal ?? "–"}</b></div>
      <div class="seta">➜</div>
      <div class="nota depois"><small>Otimizado</small><b>${o.notaOtimizada ?? "–"}</b></div>
      <p style="flex:1;min-width:220px;margin:0">${esc(o.resumo)}</p>
    </div>
  </div>
  <div class="cartao">
    <h3>Gancho (texto na tela)</h3>
    <p style="font:400 1.8rem 'Bebas Neue',sans-serif;color:var(--ouro);margin:0">${esc(o.hook?.textoTela)}</p>
  </div>
  <div class="cartao">
    <h3>O que mudou e por quê</h3>
    ${(o.mudancas || []).map((m) => `<div class="mudanca">${m.antes ? `<div class="antes">${esc(m.antes)}</div>` : ""}<div class="depois">${esc(m.depois)}</div><div class="pq">→ ${esc(m.porque)}</div></div>`).join("")}
  </div>
  <div class="cartao">
    <h3>Roteiro final</h3>
    <ol>${(o.cenas || []).map((c) => `<li style="margin-bottom:6px">${esc(c.narracao)}${c.textoTela ? ` <span class="selo claude">${esc(c.textoTela)}</span>` : ""}</li>`).join("")}</ol>
  </div>
  <div class="acoes">
    <button class="btn ouro" id="oIr">Aprovar e ajustar o roteiro ➜</button>
    <button class="btn" id="oRefazer">Pedir nova otimização</button>
  </div>`;
  $("#oIr").onclick = () => {
    aba = "roteiro";
    desenharTudo();
  };
  $("#oRefazer").onclick = async () => {
    await api("POST", `/api/projetos/${proj.id}/pedir-otimizacao`);
    await abrir(proj.id, "otimizacao");
  };
}

// ---------------------------------------------------------------- 3. roteiro

const salvarRoteiro = debounce(async () => {
  const novo = await api("PUT", `/api/projetos/${proj.id}/roteiro`, { hook: ot.hook, cenas: ot.cenas, cta: ot.cta });
  Object.assign(proj, { props: novo.props, trilha: novo.trilha, narracaoAtual: novo.narracaoAtual, otimizado: novo.otimizado, cenas: novo.cenas });
  atualizarPlayer();
  atualizarTempos();
}, 600);

function atualizarTempos() {
  const cs = proj.trilha.cenas;
  document.querySelectorAll(".cena").forEach((el, i) => {
    const t = el.querySelector(".tempo");
    if (t && cs[i]) t.textContent = `▶ ${cs[i].inicio.toFixed(1)}s – ${cs[i].fim.toFixed(1)}s`;
  });
  const av = $("#avisoNarracao");
  if (av) av.style.display = proj.narracaoAtual ? "none" : "flex";
}

function avisoNarracao() {
  return `<div class="aviso" id="avisoNarracao" style="display:${proj.narracaoAtual ? "none" : "flex"}">
    <span>${proj.narracaoExiste ? "O roteiro ou a voz mudou: a narração está desatualizada." : "Ainda sem narração: o player usa tempos estimados."}</span>
    <button class="btn teal peq" data-narrar>🎙 Gerar narração</button></div>`;
}

function ligarNarrar(el) {
  el.querySelectorAll("[data-narrar]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await api("POST", `/api/projetos/${proj.id}/narrar`);
        toast("Gerando narração…");
        vigiar();
      } catch (e) {
        toast(e.message);
      }
    }),
  );
}

function abaRoteiro(el) {
  ot.hook = ot.hook || { textoTela: "" };
  ot.cta = ot.cta || { texto: "" };
  el.innerHTML = `
  ${avisoNarracao()}
  <div class="cartao destaque">
    <h2>Roteiro</h2>
    <label>Gancho — texto grande na tela nos primeiros segundos</label>
    <input type="text" data-r="hook.textoTela" value="${esc(ot.hook.textoTela)}" placeholder="Ex.: BUILD PROIBIDA" />
    <label>Chamada final (CTA)</label>
    <input type="text" data-r="cta.texto" value="${esc(ot.cta.texto)}" placeholder="Ex.: Comenta seu main 👇" />
  </div>
  <div id="cenas"></div>
  <div class="acoes"><button class="btn" id="rAdd">+ Adicionar cena</button></div>`;

  const cenasEl = $("#cenas");
  cenasEl.innerHTML = ot.cenas
    .map(
      (c, i) => `
    <div class="cena" data-i="${i}">
      <header><b>Cena ${i + 1}</b><span class="tempo"></span><span class="esp"></span>
        <button class="btn peq" data-mover="-1" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="btn peq" data-mover="1" ${i === ot.cenas.length - 1 ? "disabled" : ""}>↓</button>
        <button class="btn peq" data-remover>✕</button></header>
      <label>Narração</label>
      <textarea data-c="narracao" rows="2" style="min-height:60px">${esc(c.narracao)}</textarea>
      <div class="linha2">
        <div><label>Texto na tela (opcional)</label><input type="text" data-c="textoTela" value="${esc(c.textoTela)}" /></div>
        <div><label>Palavras de destaque (vírgula)</label><input type="text" data-c="destaque" value="${esc((c.destaque || []).join(", "))}" /></div>
        <div><label>Trecho do gameplay (segundo)</label><input type="number" min="0" step="0.5" data-c="clipeInicio" value="${c.clipeInicio ?? ""}" placeholder="automático" /></div>
      </div>
      ${c.visual ? `<div class="visual">🎬 Sugestão de imagem: ${esc(c.visual)}</div>` : ""}
    </div>`,
    )
    .join("");

  el.querySelectorAll("[data-r]").forEach((inp) =>
    inp.addEventListener("input", () => {
      const [a, b] = inp.dataset.r.split(".");
      ot[a][b] = inp.value;
      atualizarPlayer();
      salvarRoteiro();
    }),
  );
  cenasEl.querySelectorAll(".cena").forEach((box) => {
    const i = +box.dataset.i;
    box.querySelectorAll("[data-c]").forEach((inp) =>
      inp.addEventListener("input", () => {
        const k = inp.dataset.c;
        if (k === "destaque") ot.cenas[i].destaque = inp.value.split(",").map((s) => s.trim()).filter(Boolean);
        else if (k === "clipeInicio") ot.cenas[i].clipeInicio = inp.value === "" ? null : +inp.value;
        else ot.cenas[i][k] = inp.value;
        salvarRoteiro();
      }),
    );
    box.querySelector(".tempo").onclick = () => window.EstudioPlayer.irPara(proj.trilha.cenas[i]?.inicio || 0);
    box.querySelectorAll("[data-mover]").forEach((b) =>
      b.addEventListener("click", () => {
        const j = i + +b.dataset.mover;
        [ot.cenas[i], ot.cenas[j]] = [ot.cenas[j], ot.cenas[i]];
        abaRoteiro(el);
        salvarRoteiro();
      }),
    );
    box.querySelector("[data-remover]").onclick = () => {
      if (!confirm("Remover esta cena?")) return;
      ot.cenas.splice(i, 1);
      abaRoteiro(el);
      salvarRoteiro();
    };
  });
  $("#rAdd").onclick = () => {
    ot.cenas.push({ narracao: "", destaque: [] });
    abaRoteiro(el);
  };
  ligarNarrar(el);
  atualizarTempos();
}

// ---------------------------------------------------------------- 4. visual & voz

const salvarConfig = debounce(async () => {
  const novo = await api("PUT", `/api/projetos/${proj.id}/config`, cfg);
  Object.assign(proj, { props: novo.props, trilha: novo.trilha, narracaoAtual: novo.narracaoAtual, config: novo.config });
  atualizarPlayer();
  const av = $("#avisoNarracao");
  if (av) av.style.display = proj.narracaoAtual ? "none" : "flex";
}, 500);

const pegar = (o, caminho) => caminho.split(".").reduce((a, k) => a?.[k], o);
const por = (o, caminho, v) => {
  const ks = caminho.split(".");
  const ult = ks.pop();
  ks.reduce((a, k) => a[k], o)[ult] = v;
};

function abaVisual(el) {
  const sel = (lista, v, vazio) =>
    (vazio ? `<option value="">${vazio}</option>` : "") +
    lista.map((x) => `<option value="${esc(x.arquivo ?? x.id)}" ${(x.arquivo ?? x.id) === v ? "selected" : ""}>${esc(x.nome)}${x.bytes ? ` (${fmtMB(x.bytes)})` : ""}</option>`).join("");
  const faixa = (c, rot, min, max, passo, fmt = (v) => v) =>
    `<label>${rot}: <span class="valor" data-v="${c}">${fmt(pegar(cfg, c))}</span></label><input type="range" data-cfg="${c}" data-num min="${min}" max="${max}" step="${passo}" value="${pegar(cfg, c)}" />`;
  const chk = (c, rot) => `<label class="check"><input type="checkbox" data-cfg="${c}" ${pegar(cfg, c) ? "checked" : ""}/> ${rot}</label>`;
  const cor = (c, rot) => `<label>${rot}<input type="color" data-cfg="${c}" value="${pegar(cfg, c)}" /></label>`;

  el.innerHTML = `
  ${avisoNarracao()}
  <div class="cartao destaque">
    <h2>Voz</h2>
    <div class="linha2">
      <div><label>Narrador</label><select data-cfg="voz">${sel(estado.vozes, cfg.voz)}</select></div>
      <div>${faixa("velocidade", "Velocidade", -20, 40, 5, (v) => `${v > 0 ? "+" : ""}${v}%`)}</div>
    </div>
    <div class="acoes"><button class="btn teal" data-narrar>🎙 Gerar narração</button></div>
  </div>

  <div class="cartao">
    <h3>Fundo</h3>
    <label class="check"><input type="radio" name="fundo" value="gradiente" ${cfg.fundo.tipo === "gradiente" ? "checked" : ""}/> Animado (hexágonos + partículas)</label>
    <label class="check"><input type="radio" name="fundo" value="video" ${cfg.fundo.tipo === "video" ? "checked" : ""}/> Meu gameplay</label>
    <div class="linha2">
      <div><label>Vídeo (pasta brutos/)</label><select data-cfg="fundo.arquivo">${sel(estado.brutos, cfg.fundo.arquivo, "— nenhum —")}</select></div>
      <div><label>Enviar gameplay</label><input type="file" accept="video/*" data-upload="brutos" /></div>
      <div><label>Começar no segundo</label><input type="number" min="0" step="0.5" data-cfg="fundo.inicio" data-num value="${cfg.fundo.inicio}" /></div>
    </div>
    ${chk("fundo.cortesPorCena", "Corte + zoom a cada cena (usa o “trecho do gameplay” de cada cena)")}
    ${faixa("fundo.volume", "Som do jogo", 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`)}
  </div>

  <div class="cartao">
    <h3>Música</h3>
    <div class="linha2">
      <div><label>Trilha (pasta musicas/)</label><select data-cfg="musica.arquivo">${sel(estado.musicas, cfg.musica.arquivo, "— sem música —")}</select></div>
      <div><label>Enviar música</label><input type="file" accept="audio/*" data-upload="musicas" /></div>
    </div>
    ${faixa("musica.volume", "Volume da música", 0, 0.6, 0.02, (v) => `${Math.round(v * 100)}%`)}
    <small style="color:var(--suave)">Use só músicas livres de direitos (Biblioteca de Áudio do YouTube, Pixabay).</small>
  </div>

  <div class="cartao">
    <h3>Legenda</h3>
    <div class="linha2">
      <div><label>Fonte</label><select data-cfg="estilo.fonte">${sel(window.EstudioPlayer.fontes.map((f) => ({ id: f.id, nome: f.nome })), cfg.estilo.fonte)}</select></div>
      <div>${faixa("estilo.tamanho", "Tamanho", 56, 140, 2, (v) => `${v}px`)}</div>
      <div>${faixa("estilo.palavrasPorBloco", "Palavras por vez", 1, 6, 1)}</div>
      <div>${faixa("estilo.posicaoY", "Altura na tela", 0.3, 0.8, 0.01, (v) => `${Math.round(v * 100)}%`)}</div>
    </div>
    ${chk("estilo.caixaAlta", "CAIXA ALTA")}
    <div class="cores">${cor("estilo.corTexto", "Texto")}${cor("estilo.corFalada", "Palavra falada")}${cor("estilo.corEnfase", "Destaque")}${cor("estilo.corContorno", "Contorno")}</div>
  </div>

  <div class="cartao">
    <h3>Tema e efeitos</h3>
    <div class="presets">${Object.entries(PRESETS).map(([n, p]) => `<button class="btn peq" data-preset="${n}"><i style="background:${p.tema.corDestaque}"></i>${n}</button>`).join("")}</div>
    <div class="cores">${cor("tema.cor1", "Fundo escuro")}${cor("tema.cor2", "Fundo claro")}${cor("tema.corDestaque", "Cor de destaque")}</div>
    ${chk("efeitos.hook", "Gancho grande no início")}
    ${faixa("hookDuracao", "Duração do gancho", 1, 4, 0.2, (v) => `${(+v).toFixed(1)}s`)}
    ${chk("efeitos.barraProgresso", "Barra de progresso (segura a retenção)")}
    ${chk("efeitos.flash", "Flash na troca de cena")}
    ${chk("efeitos.zoomPunch", "Zoom punch na troca de cena")}
    ${chk("ctaAtivo", "Chamada final (CTA)")}
  </div>`;

  el.querySelectorAll("[data-cfg]").forEach((inp) => {
    const ev = inp.type === "checkbox" || inp.tagName === "SELECT" ? "change" : "input";
    inp.addEventListener(ev, () => {
      let v = inp.type === "checkbox" ? inp.checked : inp.value;
      if (inp.dataset.num !== undefined) v = +v;
      if (inp.dataset.cfg.endsWith("arquivo")) v = v || null;
      por(cfg, inp.dataset.cfg, v);
      if (inp.dataset.cfg === "fundo.arquivo" && v) {
        cfg.fundo.tipo = "video";
        el.querySelector('input[name=fundo][value=video]').checked = true;
      }
      const lbl = el.querySelector(`[data-v="${inp.dataset.cfg}"]`);
      if (lbl) {
        const c = inp.dataset.cfg;
        lbl.textContent =
          c === "velocidade" ? `${v > 0 ? "+" : ""}${v}%` :
          c.endsWith("volume") || c === "estilo.posicaoY" ? `${Math.round(v * 100)}%` :
          c === "estilo.tamanho" ? `${v}px` : c === "hookDuracao" ? `${(+v).toFixed(1)}s` : v;
      }
      atualizarPlayer();
      salvarConfig();
    });
  });
  el.querySelectorAll("input[name=fundo]").forEach((r) =>
    r.addEventListener("change", () => {
      cfg.fundo.tipo = r.value;
      if (r.value === "video" && !cfg.fundo.arquivo) toast("Escolha ou envie um vídeo de gameplay");
      atualizarPlayer();
      salvarConfig();
    }),
  );
  el.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = PRESETS[b.dataset.preset];
      cfg.tema = { ...p.tema };
      Object.assign(cfg.estilo, p.cores);
      abaVisual(el);
      atualizarPlayer();
      salvarConfig();
    }),
  );
  el.querySelectorAll("[data-upload]").forEach((inp) =>
    inp.addEventListener("change", async () => {
      const f = inp.files[0];
      if (!f) return;
      const pasta = inp.dataset.upload;
      toast(`Enviando ${f.name}…`);
      try {
        const { arquivo } = await api("POST", `/api/upload?pasta=${pasta}&nome=${encodeURIComponent(f.name)}`, f);
        await carregarEstado();
        if (pasta === "brutos") cfg.fundo = { ...cfg.fundo, tipo: "video", arquivo };
        else cfg.musica.arquivo = arquivo;
        abaVisual(el);
        atualizarPlayer();
        salvarConfig();
        toast("Arquivo enviado");
      } catch (e) {
        toast(e.message);
      }
    }),
  );
  ligarNarrar(el);
}

// ---------------------------------------------------------------- 5. exportar

function abaExportar(el) {
  const o = proj.otimizado || {};
  const ocupado = proj.ocupado;
  const copiar = (txt) => `<button class="btn peq" data-copiar="${esc(txt)}">copiar</button>`;
  el.innerHTML = `
  ${avisoNarracao()}
  <div class="cartao destaque">
    <h2>Exportar</h2>
    <p style="color:var(--suave);margin-top:0">A prévia sai em 540x960 e fica pronta mais rápido. O final sai em 1080x1920 a 30fps (H.264), pronto para YouTube Shorts e TikTok.</p>
    <div class="acoes">
      <button class="btn" data-render="previa" ${ocupado ? "disabled" : ""}>⚡ Prévia rápida</button>
      <button class="btn ouro" data-render="final" ${ocupado ? "disabled" : ""}>🎬 Renderizar vídeo final</button>
      ${ocupado ? `<button class="btn" id="eCancelar">Cancelar</button>` : ""}
    </div>
  </div>
  <div class="cartao">
    <h3>Vídeos gerados</h3>
    ${(proj.renders || []).length
      ? proj.renders.map((r) => `<div class="render"><video src="${urlArq(r.arquivo)}" controls preload="metadata" playsinline></video>
          <div><b>${esc(r.nome)}</b><br><small style="color:var(--suave)">${fmtMB(r.bytes)} · ${new Date(r.data).toLocaleString("pt-BR")}</small><br>
          <a class="btn peq" style="display:inline-block;margin-top:8px;text-decoration:none" href="${urlArq(r.arquivo)}" download>⬇ Baixar</a></div></div>`).join("")
      : `<p class="vazio">Nenhum vídeo renderizado ainda.</p>`}
  </div>
  <div class="cartao">
    <h3>Kit de publicação</h3>
    ${(o.titulos || []).length ? `<label>Títulos sugeridos</label>${o.titulos.map((t) => `<div class="copiavel"><span>${esc(t)}</span>${copiar(t)}</div>`).join("")}` : `<p style="color:var(--suave)">Os títulos aparecem aqui depois da otimização.</p>`}
    ${o.descricao ? `<label>Descrição</label><div class="copiavel"><span>${esc(o.descricao)}</span>${copiar(o.descricao)}</div>` : ""}
    ${(o.hashtags || []).length ? `<label>Hashtags</label><div class="copiavel"><span>${esc(o.hashtags.join(" "))}</span>${copiar(o.hashtags.join(" "))}</div>` : ""}
  </div>`;
  el.querySelectorAll("[data-render]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await api("POST", `/api/projetos/${proj.id}/render`, { qualidade: b.dataset.render });
        toast("Renderização iniciada");
        proj.ocupado = true;
        abaExportar(el);
        vigiar();
      } catch (e) {
        toast(e.message);
      }
    }),
  );
  $("#eCancelar")?.addEventListener("click", () => api("POST", `/api/projetos/${proj.id}/cancelar`));
  el.querySelectorAll("[data-copiar]").forEach((b) =>
    b.addEventListener("click", () => navigator.clipboard.writeText(b.dataset.copiar).then(() => toast("Copiado"))),
  );
  ligarNarrar(el);
}

// ---------------------------------------------------------------- acompanhamento

let assinatura = "";
async function vigiar() {
  if (!proj) return;
  try {
    const r = await api("GET", `/api/projetos/${proj.id}/status`);
    const nova = `${r.status.etapa}|${r.status.log.length}|${r.ocupado}|${r.renders.length}`;
    proj.status = r.status;
    proj.ocupado = r.ocupado;
    desenharStatus();
    if (nova !== assinatura) {
      const antes = assinatura;
      assinatura = nova;
      if (antes) {
        // algo mudou (Claude otimizou, narração ou render terminou): recarrega
        const etapaAntes = antes.split("|")[0];
        const id = proj.id;
        const digitando = ["roteiro", "visual", "briefing"].includes(aba) && document.activeElement?.matches("input,textarea");
        if (!digitando) {
          const destino = etapaAntes === "aguardando_claude" && r.status.etapa === "otimizado" ? "otimizacao" : aba;
          await abrir(id, destino);
          if (destino === "otimizacao" && etapaAntes === "aguardando_claude") toast("O Claude terminou de otimizar o roteiro!");
        }
        await carregarEstado();
      }
    }
  } catch {}
}
setInterval(vigiar, 1500);

// ---------------------------------------------------------------- início

document.querySelectorAll("#etapas button").forEach((b) =>
  b.addEventListener("click", () => {
    aba = b.dataset.aba;
    desenharEtapas();
    desenharAba();
  }),
);
$("#seletor").onchange = (e) => e.target.value && abrir(e.target.value);
$("#btnNovo").onclick = () => {
  proj = null;
  cfg = null;
  ot = null;
  assinatura = "";
  aba = "briefing";
  history.replaceState(null, "", "#");
  $("#seletor").value = "";
  desenharTudo();
};

(async () => {
  await carregarEstado();
  const id = location.hash.slice(1) || estado.projetos[0]?.id;
  if (id && estado.projetos.some((p) => p.id === id)) await abrir(id);
  else desenharTudo();
})();
