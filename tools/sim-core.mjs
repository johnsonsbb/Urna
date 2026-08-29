// Motor do simulador da fase 1. Modelo analítico do balance.js, sem tela e sem
// tick: um passo de um segundo, um jogador que compra por tempo de retorno.

import * as B from '../src/balance.js';

export const snapshot = (s) => ({ upgrades: s.upgrades, floor: s.floor, essence: s.essence });
export const rate = (s) => B.goldPerSecond(snapshot(s));

// Melhor compra: menor custo por unidade de taxa ganha. Descer entra na disputa
// como se fosse mais um upgrade, porque para o jogador é exatamente isso.
export function bestBuy(s, budget) {
  let best = null;
  const before = rate(s);

  for (const id of B.UPGRADE_IDS) {
    const lv = s.upgrades[id];
    if (lv >= B.upgradeCap(id)) continue;
    const cost = B.upgradeCost(id, lv);
    if (cost > budget) continue;
    s.upgrades[id] = lv + 1;
    const delta = rate(s) - before;
    s.upgrades[id] = lv;
    if (delta <= 0) continue;
    const payback = cost / delta;
    if (!best || payback < best.payback) best = { kind: 'upgrade', id, cost, payback };
  }

  const descend = B.descendCost(s.floor);
  if (descend <= budget) {
    s.floor++;
    const delta = rate(s) - before;
    s.floor--;
    if (delta > 0) {
      const payback = descend / delta;
      if (!best || payback < best.payback) best = { kind: 'floor', id: 'descer', cost: descend, payback };
    }
  }

  return best;
}

export function runSim({ hours = 6, prestige = true, patient = false, onEvent = null } = {}) {
  const s = { upgrades: B.emptyUpgrades(), floor: 1, gold: 0, essence: 0 };
  const log = [];
  const gaps = [];

  // Dobros do recorde de taxa, não da taxa atual: senão cada prestígio zeraria
  // e a re-subida contaria como progresso novo.
  let peak = rate(s);
  let next = peak * 2;
  let lastAt = 0;
  let prestiges = 0;
  let bestFloor = 1;
  const total = hours * 3600;

  for (let t = 0; t < total; t++) {
    s.gold += rate(s);

    const buy = bestBuy(s, patient ? Infinity : s.gold);
    if (buy && buy.cost <= s.gold) {
      s.gold -= buy.cost;
      if (buy.kind === 'floor') { s.floor++; bestFloor = Math.max(bestFloor, s.floor); }
      else s.upgrades[buy.id]++;
      if (onEvent) onEvent({ t, ...buy, level: buy.kind === 'floor' ? s.floor : s.upgrades[buy.id], rate: rate(s) });
    }

    if (prestige && B.canPrestige(s.floor, s.essence)) {
      const gain = B.essenceGain(s.floor);
      const tatica = s.upgrades.tatica;   // tática é conhecimento, não equipamento
      s.essence += gain;
      s.upgrades = B.emptyUpgrades();
      s.upgrades.tatica = tatica;
      s.floor = 1;
      s.gold = 0;
      prestiges++;
      if (onEvent) onEvent({ t, kind: 'prestige', id: 'prestígio', gain, essence: s.essence, rate: rate(s) });
    }

    const r = rate(s);
    if (r > peak) peak = r;
    while (peak >= next) { gaps.push(t - lastAt); lastAt = t; next *= 2; }

    if (t % 600 === 0) log.push({ t, gold: s.gold, rate: r, floor: s.floor, essence: s.essence });
  }

  return { state: s, log, gaps, prestiges, bestFloor, hours };
}

// Métricas de forma da curva. A mediana sozinha engana: o que reprova o
// balanceamento é a mistura de paredes longas com rajadas de segundos.
export function metrics({ gaps, hours }) {
  const mins = gaps.map((g) => g / 60);
  if (!mins.length) return { doublings: 0 };
  const half = mins.slice(Math.floor(mins.length / 2));
  const med = (a) => { const x = [...a].sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; };
  return {
    doublings: mins.length,
    perHour: mins.length / hours,
    median: med(mins),
    lateMedian: med(half),
    max: Math.max(...mins),
    burstShare: mins.filter((m) => m < 1).length / mins.length,
    inWindow: mins.filter((m) => m >= 5 && m <= 15).length / mins.length,
  };
}
