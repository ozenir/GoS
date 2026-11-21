// Testes da leitura das mensagens da live, no formato que a biblioteca do TikTok entrega de verdade.
// As mensagens são montadas, codificadas e decodificadas pela própria biblioteca (tiktok-live-proto v3),
// e o resultado vai até o jogo: o comentário precisa virar voto de direção e de habilidade.
// Rodar:  node teste/live.test.mjs
import assert from 'node:assert/strict';
import * as proto from 'tiktok-live-proto/v3';
import { pessoa, textoDoComentario, curtidasDe } from '../leitura.js';
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

console.log(`\n${ok} testes passaram.`);
