// Teste de estabilidade: roda meia hora de jogo com cada personagem, sem ninguém interagindo,
// e falha se algum herói travar, congelar ou ficar imortal.   Rodar:  node teste/estabilidade.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { CLASSES } from '../public/js/core/dados.js';

const DT = 1 / 30, MINUTOS = 30, VIDA_MAXIMA = 10 * 60;   // nenhum herói pode passar de 10 min sem interação
let ok = 0;
for (const classe of Object.keys(CLASSES)) {
  const j = new Jogo({ seed: 1000 + ok, classe });
  const mortes = [];
  let ultimoQ = -1, semAndar = 0;
  for (let p = 0; p < MINUTOS * 60 * 30; p++) {
    j.update(DT);
    for (const e of j.drainEvents()) if (e.type === 'heroi_morreu') mortes.push(e.relatorio.tempo);
    // herói vivo tem que continuar andando de cruzamento em cruzamento
    if (j.fase === 'jogo') {
      if (j.stats.quarteiroes !== ultimoQ) { ultimoQ = j.stats.quarteiroes; semAndar = 0; }
      else if (!j.room) semAndar += DT;
      assert.ok(semAndar < 120, `${classe}: herói ficou 2 minutos sem chegar a nenhum cruzamento (travou?)`);
      assert.ok(j.t - j.stats.inicio < VIDA_MAXIMA, `${classe}: herói passou de 10 minutos vivo sem interação (imortal?)`);
    } else { semAndar = 0; ultimoQ = -1; }
  }
  assert.ok(mortes.length >= 6, `${classe}: só ${mortes.length} heróis caíram em ${MINUTOS} minutos`);
  const media = mortes.reduce((a, b) => a + b, 0) / mortes.length;
  console.log(`  ✔ ${CLASSES[classe].nome.padEnd(10)} ${mortes.length} heróis em ${MINUTOS} min, média ${Math.floor(media / 60)}:${String(Math.round(media % 60)).padStart(2, '0')}`);
  ok++;
}
console.log(`\n${ok} personagens estáveis.`);
