// Varre variantes de balanceamento e mede a forma da curva de cada uma.
//   node tools/sweep.mjs [horas]

import { TUNING } from '../src/balance.js';
import { runSim, metrics } from './sim-core.mjs';

const HOURS = Number(process.argv[2]) || 24;
const DEFAULTS = structuredClone(TUNING);

// Cada variante é um patch sobre os números do plano.
const VARIANTS = [
  ['N + descer x6',      { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, descendStep: 6 }],
  ['N + descer x7',      { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, descendStep: 7 }],
  ['N + descer x8',      { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, descendStep: 8 }],
  ['N + descer x9',      { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, descendStep: 9 }],
  ['N + descer x11',      { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, descendStep: 11 }],
  ['N + hp 3,3',          { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, hpStep: 3.3 }],
  ['N + hp 3,7',          { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, hpStep: 3.7 }],
  ['N + descer 8, hp 3,3',{ cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, descendStep: 8, hpStep: 3.3 }],
  ['N + prestigio 0,10',  { cost: { tocha: { cap: Infinity } }, spawnFloorSec: 0.02, spawnStep: 0.95, valueStep: 4, hpStep: 3.5, essencePerPoint: 0.10 }],
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
