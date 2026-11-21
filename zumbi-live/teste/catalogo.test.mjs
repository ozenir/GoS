// O jogo aberto sem o programa da live (prévia, botões de teste, primeiros instantes da live) usa catalogo.js.
// Ele precisa ter os mesmos números do config.json.   Rodar:  node teste/catalogo.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOGO_PADRAO, PRESENTES_PADRAO, SEGUIR_PADRAO, COMPARTILHAR_PADRAO } from '../public/js/catalogo.js';

const config = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
assert.deepEqual(JOGO_PADRAO, config.jogo, 'catalogo.js → JOGO_PADRAO diferente do config.json → jogo');
assert.deepEqual(PRESENTES_PADRAO, config.presentes.por_nome, 'catalogo.js → PRESENTES_PADRAO diferente do config.json → presentes');
assert.deepEqual(SEGUIR_PADRAO, config.seguir, 'catalogo.js → SEGUIR_PADRAO diferente do config.json → seguir');
assert.deepEqual(COMPARTILHAR_PADRAO, config.compartilhar, 'catalogo.js → COMPARTILHAR_PADRAO diferente do config.json → compartilhar');
console.log('catálogo igual ao config.json: ok');
