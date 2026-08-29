// Varre variantes de balanceamento e mede a forma da curva de cada uma.
//   node tools/sweep.mjs [horas]

import { TUNING } from '../src/balance.js';
import { runSim, metrics } from './sim-core.mjs';

const HOURS = Number(process.argv[2]) || 24;
const DEFAULTS = structuredClone(TUNING);

// Cada variante é um patch sobre os números do plano.
// A primeira linha é o balanceamento em vigor; a segunda são os números do
// plano como estavam escritos, para a comparação ficar registrada. O resto é
// sensibilidade: mexer num eixo de cada vez e ver a curva reagir.
const VARIANTS = [
  ['ajustado (em vigor)',    {}],
  ['plano original',         { valueStep: 6, spawnStep: 0.92, spawnFloorSec: 0.15, descendStep: 11, cost: { tocha: { cap: 25 } } }],
  ['só o valor do andar ×6', { valueStep: 6 }],
  ['só a tocha com teto 25', { cost: { tocha: { cap: 25 } } }],
  ['só o piso da isca 0,15s',{ spawnFloorSec: 0.15 }],
  ['só descer ×11',          { descendStep: 11 }],
  ['descer ×6',              { descendStep: 6 }],
  ['prestígio ×0,10',        { essencePerPoint: 0.10 }],
];

function apply(patch) {
  for (const [k, v] of Object.entries(DEFAULTS)) TUNING[k] = structuredClone(v);
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'cost') for (const [id, c] of Object.entries(v)) Object.assign(TUNING.cost[id], c);
    else TUNING[k] = v;
  }
}

const pct = (x) => `${(x * 100).toFixed(0)}%`.padStart(4);
console.log(`\n  ${HOURS}h de jogo por variante\n`);
console.log('  variante                          dobros  mediana  2ª met.  parede  rajada  5–15min  andar  prest.');
console.log('  ' + '-'.repeat(97));

for (const [name, patch] of VARIANTS) {
  apply(patch);
  const res = runSim({ hours: HOURS });
  const m = metrics(res);
  const ok = m.inWindow >= 0.5 && m.burstShare <= 0.15;
  console.log(
    `  ${name.padEnd(32)}${String(m.doublings).padStart(6)}` +
    `${m.median.toFixed(1).padStart(9)}${m.lateMedian.toFixed(1).padStart(9)}` +
    `${m.max.toFixed(0).padStart(8)}${pct(m.burstShare).padStart(8)}${pct(m.inWindow).padStart(9)}` +
    `${String(res.bestFloor).padStart(7)}${String(res.prestiges).padStart(7)}  ${ok ? '✓' : ''}`
  );
}
apply({});
console.log('\n  mediana/2ª metade/parede em minutos. rajada = dobros em menos de 1 min.\n');
