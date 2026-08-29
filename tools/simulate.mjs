// Fase 1: balanceamento sem tela.
//
// Roda horas de jogo em segundos, com um jogador simulado que sempre compra o
// upgrade de menor tempo de retorno e espera quando ele não está no bolso.
// Usa o modelo analítico do balance.js, não a simulação de tick.
//
//   node tools/simulate.mjs [horas] [--verbose] [--no-prestige] [--patient]
//
// Política padrão: entre o que dá para pagar agora, compra o de menor tempo de
// retorno. Com --patient, guarda para o melhor retorno global mesmo que ele
// esteja fora do bolso — o que revela quanto tempo o jogo fica parado.

import * as B from '../src/balance.js';
import { runSim, metrics, snapshot } from './sim-core.mjs';

const HOURS = Number(process.argv[2]) || 6;
const VERBOSE = process.argv.includes('--verbose');
const PRESTIGE = !process.argv.includes('--no-prestige');
const PATIENT = process.argv.includes('--patient');

const fmt = (n) => {
  if (!isFinite(n)) return '∞';
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let i = 0, v = Math.abs(n);
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return (n < 0 ? '-' : '') + v.toFixed(i === 0 ? 0 : v < 10 ? 2 : v < 100 ? 1 : 0) + u[i];
};
const clock = (s) => [s / 3600, (s / 60) % 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':');

const onEvent = VERBOSE ? (e) => {
  if (e.kind === 'prestige') console.log(`${clock(e.t)}  PRESTÍGIO +${e.gain} essência (total ${e.essence}, x${B.essenceMultiplier(e.essence).toFixed(2)})`);
  else console.log(`${clock(e.t)}  ${e.id.padEnd(12)} → ${String(e.level).padStart(3)}  custo ${fmt(e.cost).padStart(8)}  retorno ${clock(e.payback)}  taxa ${fmt(e.rate)}/s`);
} : null;

const res = runSim({ hours: HOURS, prestige: PRESTIGE, patient: PATIENT, onEvent });
const m = metrics(res);
const s = res.state;

console.log(`\n  tempo     ouro       ouro/s     andar  essência`);
console.log('  ' + '-'.repeat(48));
for (const l of res.log) console.log(`  ${clock(l.t)}  ${fmt(l.gold).padStart(9)}  ${fmt(l.rate).padStart(9)}  ${String(l.floor).padStart(5)}  ${fmt(l.essence).padStart(8)}`);

console.log(`\n  níveis: ${B.UPGRADE_IDS.map((id) => `${id} ${s.upgrades[id]}`).join('  ')}`);
console.log(`  andar ${s.floor} (melhor ${res.bestFloor})   essência ${fmt(s.essence)}   prestígios ${res.prestiges}`);
console.log(`\n  dobros: ${m.doublings} em ${HOURS}h (${m.perHour.toFixed(1)}/h)`);
console.log(`  por dobro — mediana ${m.median.toFixed(1)} min, 2ª metade ${m.lateMedian.toFixed(1)} min, maior parede ${m.max.toFixed(0)} min`);
console.log(`  ${(m.burstShare * 100).toFixed(0)}% dos dobros vieram em menos de 1 min (rajada)`);
console.log(`  ${(m.inWindow * 100).toFixed(0)}% caíram na janela de 5–15 min`);

// Critério da fase 1: dobrar em ritmo estável, entre 5 e 15 min por dobro, sem
// explodir. A rajada entra junto porque uma mediana boa pode esconder um jogo
// que alterna parede de duas horas com dez dobros em seis segundos.
const inBand = (x) => x >= 5 && x <= 15;
const ok = inBand(m.median) && inBand(m.lateMedian) && m.burstShare <= 0.15 && isFinite(B.goldPerSecond(snapshot(s)));
console.log(`\n  critério da fase 1: ${ok ? 'OK' : 'FORA'}  (mediana e mediana tardia em 5–15 min, menos de 15% em rajada, sem explodir)`);
