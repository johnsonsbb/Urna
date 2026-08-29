// Compara a fórmula analítica do balance.js com o que a simulação de tick
// realmente produz. Importa porque é a fórmula que paga o ganho offline: se
// ela mentir, o jogador ganha a mais ou a menos por estar fora.
//
//   node tools/verify.mjs [minutos-por-cenario]

import * as B from '../src/balance.js';
import * as G from '../src/game.js';

const MIN = Number(process.argv[2]) || 10;
const TICKS = Math.round((MIN * 60) / B.TICK);

const CENARIOS = [
  ['início',                     { }, 1],
  ['botas/lâmina cedo',          { botas: 10, lamina: 10 }, 1],
  ['mochila grande',             { botas: 10, lamina: 12, mochila: 8 }, 1],
  ['alcance alto',               { botas: 10, lamina: 12, alcance: 20 }, 1],
  ['tática 1',                   { botas: 12, lamina: 16, tatica: 1 }, 2],
  ['tática 2',                   { botas: 12, lamina: 16, tatica: 2 }, 2],
  ['tática 3',                   { botas: 12, lamina: 16, mochila: 6, tatica: 3 }, 2],
  ['tática 4, 4 heróis',         { botas: 14, lamina: 20, tatica: 4, companheiro: 3 }, 3],
  ['sala grande',                { botas: 20, lamina: 26, tocha: 6, isca: 10, tatica: 2 }, 3],
  ['limitado por spawn',         { botas: 30, lamina: 60, alcance: 30, mochila: 10, tatica: 3, companheiro: 4 }, 4],
  ['fundo, muitos heróis',       { botas: 40, lamina: 90, alcance: 40, mochila: 14, isca: 20, tocha: 10, tatica: 4, companheiro: 8 }, 6],
];

console.log(`\n  ${MIN} min simulados por cenário\n`);
console.log('  cenário                     andar   medido      fórmula     erro   trava');
console.log('  ' + '-'.repeat(70));

let worst = 0;
for (const [nome, ups, floor] of CENARIOS) {
  const s = G.createState(20260829);
  Object.assign(s.upgrades, ups);
  s.floor = floor;
  G.syncHeroes(s);

  // Aquece: o primeiro ciclo começa com o campo vazio e a mochila vazia, o que
  // não representa o regime que a fórmula descreve.
  for (let i = 0; i < TICKS / 4; i++) G.tick(s);
  const g0 = s.gold;
  const t0 = s.stats.playTime;
  for (let i = 0; i < TICKS; i++) G.tick(s);

  const medido = (s.gold - g0) / (s.stats.playTime - t0);
  const formula = G.rate(s);
  const erro = (medido - formula) / formula;
  worst = Math.max(worst, Math.abs(erro));
  const b = B.bottleneck({ upgrades: s.upgrades, floor: s.floor });

  console.log(
    `  ${nome.padEnd(26)}${String(floor).padStart(4)}` +
    `${medido.toExponential(2).padStart(11)}${formula.toExponential(2).padStart(12)}` +
    `${((erro * 100).toFixed(0) + '%').padStart(8)}   ${b.limitedBy}`
  );
}

console.log(`\n  pior divergência: ${(worst * 100).toFixed(0)}%`);
console.log(`  ${worst <= 0.25 ? 'OK' : 'ATENÇÃO'} — a fórmula é o modelo do ciclo, não a medição dele;`);
console.log('  ela paga o offline, então erro grande vira ganho injusto para um dos lados.\n');
