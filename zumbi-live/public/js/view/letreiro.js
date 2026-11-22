// ============================================================================
//  LETREIRO — quando o que uma linha do HUD tem pra mostrar não cabe na largura dela, a linha vira um
//  letreiro de jornal: o conteúdo escorrega da direita pra esquerda sem parar, com uma cópia logo atrás
//  pra emendar a volta. Se voltar a caber, para e fica no lugar de sempre. O visual da linha não muda.
//
//  Marcação:  <div class="letreiro ..."><div class="trilho"><div class="grupo">...</div><div class="grupo eco" aria-hidden="true"></div></div></div>
//  O HUD continua escrevendo só no primeiro .grupo; a cópia (.eco) é atualizada daqui, sem os ids.
// ============================================================================
export const LETREIRO = {
  velocidade: 0.11,   // larguras da linha por segundo (atravessa a linha em ~9 s: dá pra ler)
  folga: 0.09,        // espaço entre o fim do conteúdo e a cópia, em larguras da linha
  intervalo: 0.25     // de quanto em quanto tempo mede e atualiza a cópia (s)
};

export class Letreiro {
  constructor(caixa) {
    this.caixa = caixa;
    this.trilho = caixa.querySelector('.trilho');
    this.grupo = caixa.querySelector('.grupo:not(.eco)');
    this.eco = caixa.querySelector('.grupo.eco');
    this.rola = false; this.t = 0; this.dist = 0; this.copia = '';
  }

  // largura útil da linha (sem o padding), largura que o conteúdo precisa parado (espaçamento normal da linha)
  // e rolando (o espaçamento do letreiro pode ser maior)
  medir() {
    const cs = getComputedStyle(this.caixa);
    const util = this.caixa.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const filhos = this.grupo.children, n = filhos.length;
    let soma = 0;
    for (let i = 0; i < n; i++) soma += filhos[i].getBoundingClientRect().width;
    const vaos = Math.max(0, n - 1);
    return {
      util,
      conteudo: soma + vaos * (parseFloat(cs.columnGap) || 0),
      rolando: soma + vaos * (parseFloat(getComputedStyle(this.grupo).columnGap) || 0)
    };
  }

  update(dt) {
    // anda todo quadro (posição contínua: se o conteúdo muda de largura, o letreiro não dá tranco)
    if (this.rola && this.dist > 0) {
      this.x = ((this.x || 0) + this.vel * dt) % this.dist;
      this.trilho.style.transform = `translateX(${-this.x.toFixed(1)}px)`;
    }
    if ((this.t -= dt) > 0) return;
    this.t = LETREIRO.intervalo;
    if (!this.caixa.offsetParent) return;   // escondida
    const { util, conteudo } = this.medir();
    // histerese: começa a rolar quando passa da largura, só para quando sobra um pouco
    const rolar = this.rola ? conteudo > util - 6 : conteudo > util + 1;
    if (rolar !== this.rola) {
      this.rola = rolar;
      this.caixa.classList.toggle('rola', rolar);
      this.x = 0; this.dist = 0; this.trilho.style.transform = '';
      if (!rolar) { this.eco.innerHTML = ''; this.copia = ''; return; }
    }
    if (!this.rola) return;
    // a cópia acompanha os números ao vivo
    const html = this.grupo.innerHTML;
    if (html !== this.copia) { this.copia = html; this.eco.innerHTML = html.replace(/\sid="[^"]*"/g, ''); }
    // uma volta = conteúdo + folga (a cópia começa ali)
    const folga = Math.round(util * LETREIRO.folga);
    this.caixa.style.setProperty('--folga', folga + 'px');
    this.dist = this.medir().rolando + folga;
    this.vel = util * LETREIRO.velocidade;
  }
}
