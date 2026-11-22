// Testes da leitura das mensagens da live, no formato que a biblioteca do TikTok entrega de verdade.
// As mensagens são montadas, codificadas e decodificadas pela própria biblioteca (tiktok-live-proto v3),
// e o resultado vai até o jogo: o comentário precisa virar voto de direção e de habilidade.
// Rodar:  node teste/live.test.mjs
import assert from 'node:assert/strict';
import * as proto from 'tiktok-live-proto/v3';
import { pessoa, textoDoComentario, curtidasDe, lerPresente } from '../leitura.js';
import { moedasDoPresente, planoDoPresente } from '../presentes.js';
import fs from 'node:fs';
import { Jogo } from '../public/js/core/jogo.js';
import { xpParaNivel } from '../public/js/core/dados.js';
import { lerVoto, lerEscolha } from '../public/js/core/votacao.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const vazio = new Uint8Array();

// Monta uma mensagem como a live manda (codifica e decodifica, igual chega pela internet)
function usuario(nick, arroba, id) {
  const u = proto.User.decode(vazio);
  u.nickname = nick; u.displayId = arroba; u.id = id;
  return u;
}
function comentario(texto, u) {
  const m = proto.WebcastChatMessage.decode(vazio);
  m.content = texto; m.user = u;
  return proto.WebcastChatMessage.decode(proto.WebcastChatMessage.encode(m).finish());
}
function curtidas(n, u) {
  const m = proto.WebcastLikeMessage.decode(vazio);
  m.count = n; m.user = u;
  return proto.WebcastLikeMessage.decode(proto.WebcastLikeMessage.encode(m).finish());
}
// O que o servidor manda pro jogo quando chega um comentário (servidor.js → processarChat)
const paraOJogo = d => ({ type: 'chat', ...pessoa(d.user), texto: textoDoComentario(d) });

const dono = usuario('Ozenir', 'ozenirnasc', '7001');

teste('comentário no formato novo: o texto vem em "content" (não existe mais "comment")', () => {
  const d = comentario('2', dono);
  assert.equal(d.comment, undefined);
  assert.equal(textoDoComentario(d), '2');
});

teste('quem comentou: @ e nome', () => {
  const p = pessoa(comentario('oi', dono).user);
  assert.equal(p.id, 'ozenirnasc');
  assert.equal(p.nick, 'Ozenir');
});

teste('formato antigo ainda funciona (comment, likeCount, uniqueId)', () => {
  assert.equal(textoDoComentario({ comment: '3' }), '3');
  assert.equal(curtidasDe({ likeCount: 7 }), 7);
  assert.equal(pessoa({ uniqueId: 'fulano', nickname: 'Fulano' }).id, 'fulano');
});

teste('curtidas no formato novo: quantidade em "count"', () => {
  assert.equal(curtidasDe(curtidas(15, dono)), 15);
});

teste('comentário "2" da live vira voto de direção no jogo', () => {
  const j = new Jogo({ seed: 5, classe: 'policial' });
  j.protecao = 99;
  for (let i = 0; i < 60; i++) j.update(1 / 30);
  assert.ok(j.voto?.aberta, 'votação aberta');
  const votos = [];
  j.handle(paraOJogo(comentario('2', dono)));
  for (const e of j.drainEvents()) if (e.type === 'voto') votos.push(e);
  assert.equal(votos.length, 1);
  assert.equal(j.voto.opcoes.find(o => o.id === 'frente').votos, 1);
});

teste('comentário "b" da live vira voto de habilidade no jogo', () => {
  const j = new Jogo({ seed: 5, classe: 'policial' });
  j.protecao = 99;
  j.ganharXp(xpParaNivel(1));
  for (let i = 0; i < 60; i++) j.update(1 / 30);
  assert.ok(j.escolha?.voto.aberta, 'escolha aberta');
  j.handle(paraOJogo(comentario('B', usuario('Bia', 'bia.s', '7002'))));
  assert.equal(j.escolha.voto.opcoes.find(o => o.id === 'b').votos, 1);
});

teste('o próprio dono da live também vota (não é ignorado)', () => {
  const j = new Jogo({ seed: 5, classe: 'policial' });
  j.protecao = 99;
  for (let i = 0; i < 60; i++) j.update(1 / 30);
  j.handle(paraOJogo(comentario('esquerda', dono)));
  assert.equal(j.voto.total, 1);
});

teste('jeitos comuns de votar na direção: 2️⃣, #3, 22, "vai 2", "bora no 3"', () => {
  for (const [t, op] of [['2', 'frente'], ['2️⃣', 'frente'], ['#3', 'direita'], ['22', 'frente'], ['vai 2', 'frente'], ['bora no 3 galera', 'direita'], ['ESQUERDA!!', 'esquerda'], ['5', 'voltar']]) {
    assert.equal(lerVoto(t), op, t);
  }
  for (const t of ['oi gente', 'tenho 2 gatos e 3 cachorros', 'kkkk']) assert.equal(lerVoto(t), null, t);
});

teste('jeitos comuns de escolher habilidade: a, A!, aaa, a), letra b, opção c, 🅰️', () => {
  for (const [t, l] of [['a', 'a'], ['A!', 'a'], ['aaa', 'a'], ['a)', 'a'], ['letra b', 'b'], ['opção c', 'c'], ['hab a', 'a'], ['🅰️', 'a'], ['🅱️', 'b']]) assert.equal(lerEscolha(t), l, t);
  for (const t of ['a gente vai', 'b2', 'abc']) assert.equal(lerEscolha(t), null, t);
});

// Presente no formato novo (v3), codificado e decodificado como chega da internet
function presente({ nome = 'Rose', moedas = 1, tipo = 1, combo = true, repeticoes = 1, fim = 0 } = {}, u = dono) {
  const g = proto.Gift.decode(vazio);
  g.name = nome; g.diamondCount = moedas; g.type = tipo; g.combo = combo;
  const m = proto.WebcastGiftMessage.decode(vazio);
  m.gift = g; m.user = u; m.repeatCount = repeticoes; m.repeatEnd = fim; m.giftId = '5655'; m.groupId = '1';
  return proto.WebcastGiftMessage.decode(proto.WebcastGiftMessage.encode(m).finish());
}
const tabela = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8')).presentes.por_nome;

teste('presente no formato novo: nome, moedas e sequência vêm em "gift"', () => {
  const r = lerPresente(presente());
  assert.equal(r.nome, 'Rose'); assert.equal(r.moedas, 1); assert.equal(r.combo, true); assert.equal(r.total, 1);
  const r2 = lerPresente(presente({ nome: 'Coconut Drink', moedas: 5, tipo: 0, combo: false }));
  assert.equal(r2.moedas, 5); assert.equal(r2.combo, false);
});

teste('presente de sequência marcado só por "combo" (type 0) também conta como sequência', () => {
  assert.equal(lerPresente(presente({ tipo: 0, combo: true })).combo, true);
});

teste('o TikTok não mandou o valor (0): usa o preço da tabela (ou 1), pra contar no cabo de guerra e nos bônus', () => {
  const r = lerPresente(presente({ moedas: 0 }));
  assert.equal(r.moedas, 0);
  assert.deepEqual(moedasDoPresente(tabela, r.nome, r.moedas), { moedas: 1, completou: true });
  assert.equal(moedasDoPresente(tabela, 'Bebida de coco', 0).moedas, 5);
  assert.equal(moedasDoPresente(tabela, 'Presente desconhecido', 0).moedas, 1);
});

teste('Rosa da live: vira cura, conta no cabo de guerra e solta o drop pro herói', () => {
  const r = lerPresente(presente());
  const [parte] = planoDoPresente(tabela, r.nome, moedasDoPresente(tabela, r.nome, r.moedas).moedas, r.total);
  const j = new Jogo({ seed: 5, classe: 'policial' }); j.hero.invT = 1e9;
  for (let i = 0; i < 30; i++) j.update(1 / 30);
  const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push(t); return e0(t, d); };
  const p = pessoa(presente().user);
  j.hero.vida = j.hero.vidaMax * 0.5;   // ferido (com a vida cheia, a Rosa vira 🛡️ blindado)
  j.handle({ type: 'presente', ...p, giftName: r.nome, count: parte.count, coins: parte.coins, regra: parte.regra, rank: { ajuda: [{ ...p, coins: parte.coins }], atrapalha: [] } });
  for (let i = 0; i < 2 * 30; i++) j.update(1 / 30);
  assert.equal(parte.regra.efeito, 'cura');
  assert.ok(j.cabo.ajuda && j.cabo.ajuda.coins === 1 && j.cabo.pct > 0.5, 'cabo de guerra puxou pro ajudante');
  assert.ok(ev.includes('presente') && ev.includes('cura'), 'curou');
  assert.ok(j.itens.some(it => it.kind === 'drop') || ev.includes('item_caindo'), 'drop caindo pro herói');
});

console.log(`\n${ok} testes passaram.`);
