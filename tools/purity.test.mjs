// A regra que não pode ser quebrada: balance.js e game.js não podem tocar em
// document, window, canvas ou localStorage. É essa lógica que vai rodar no
// servidor na fase 5 para validar progresso — com DOM dentro, é impossível.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PROIBIDO = ['document', 'window', 'canvas', 'localStorage'];

for (const arquivo of ['balance.js', 'game.js']) {
  test(`src/${arquivo} não referencia o navegador`, async () => {
    const src = await readFile(new URL(`../src/${arquivo}`, import.meta.url), 'utf8');
    const semComentarios = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const palavra of PROIBIDO) {
      const achou = new RegExp(`\\b${palavra}\\b`).test(semComentarios);
      assert.equal(achou, false, `${arquivo} referencia "${palavra}"`);
    }
  });
}

test('os dois módulos carregam fora do navegador', async () => {
  const B = await import('../src/balance.js');
  const G = await import('../src/game.js');
  const s = G.createState(1);
  G.tick(s);
  assert.ok(B.goldPerSecond({ upgrades: s.upgrades, floor: 1, essence: 0 }) > 0);
});
