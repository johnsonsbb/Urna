// balance.js — constantes e fórmulas.
//
// REGRA: este arquivo não pode referenciar document, window, canvas ou
// localStorage. Ele roda no navegador e vai rodar no servidor, com a mesma
// resposta. Só entra e sai dado puro. Ver tools/purity.test.mjs.

// ---------------------------------------------------------------- simulação

export const TICK = 0.05;          // passo fixo, em segundos
export const DEPOSIT_TIME = 0.5;   // tempo parado no baú
export const SPAWN_MARGIN = 10;    // borda onde inimigo não nasce
export const CHEST_CLEAR = 26;     // raio livre em volta do baú

// ------------------------------------------------------------------- sala

export const baseRoom = () => roomSize(0);
export const baseArea = () => { const r = baseRoom(); return r.w * r.h; };


// ------------------------------------------------------------------ tunables
//
// Todo número que o balanceamento pode querer mexer mora aqui, num objeto só,
// para o simulador da fase 1 conseguir varrer variantes sem editar código.
// O jogo nunca escreve neste objeto — só as ferramentas de tools/.

export const TUNING = {
  // efeitos
  speedBase: 85, speedStep: 1.045,
  damageBase: 10, damageStep: 1.07,
  reachBase: 14, reachStep: 3,
  backpackBase: 5, backpackStep: 3,
  spawnBase: 1.1, spawnStep: 0.95, spawnFloorSec: 0.02,
  roomW: 300, roomH: 220, roomStepW: 40, roomStepH: 30,
  tacticFactor: [0.52, 0.40, 0.36, 0.30, 0.26],

  // custos: base e fator por eixo
  cost: {
    botas:       { base: 5,   factor: 1.10, cap: Infinity },
    lamina:      { base: 6,   factor: 1.10, cap: Infinity },
    alcance:     { base: 14,  factor: 1.10, cap: Infinity },
    mochila:     { base: 10,  factor: 1.10, cap: Infinity },
    isca:        { base: 20,  factor: 1.10, cap: Infinity },
    tocha:       { base: 200, factor: 1.30, cap: 100 },
    companheiro: { base: 700, factor: 2.60, cap: 8 },
    tatica:      { base: 400, factor: 20,   cap: 4 },
  },

  // andares
  valueStep: 4, hpBase: 10, hpStep: 3.5, descendBase: 300, descendStep: 8,

  // prestígio
  prestigeFloor: 5, essenceBase: 5, essenceStep: 1.55,
  essencePerPoint: 0.08, prestigeRatio: 1.5, prestigeMin: 5,

  // campo
  enemyCapBase: 30,
};

// ------------------------------------------------------------- os oito eixos

export const UPGRADE_IDS = [
  'botas', 'lamina', 'alcance', 'mochila', 'isca', 'tocha', 'companheiro', 'tatica',
];

export const UPGRADES = UPGRADE_IDS.map((id) => ({ id, get cost() { return TUNING.cost[id]; } }));

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const upgradeCap = (id) => TUNING.cost[id].cap;

export function emptyUpgrades() {
  const o = {};
  for (const id of UPGRADE_IDS) o[id] = 0;
  return o;
}

// ------------------------------------------------------------------- custos

export function upgradeCost(id, level) {
  const c = TUNING.cost[id];
  return Math.ceil(c.base * Math.pow(c.factor, level));
}

// Custo de comprar `count` níveis a partir de `level`. A soma é feita nível a
// nível porque cada custo é arredondado para cima antes de somar.
export function bulkCost(id, level, count) {
  let total = 0;
  for (let i = 0; i < count; i++) total += upgradeCost(id, level + i);
  return total;
}

// Quantos níveis cabem em `gold`, respeitando o teto do upgrade.
export function maxAffordable(id, level, gold) {
  const cap = TUNING.cost[id].cap;
  let count = 0;
  let cost = 0;
  while (level + count < cap && count < 10000) {
    const next = upgradeCost(id, level + count);
    if (cost + next > gold) break;
    cost += next;
    count++;
  }
  return { count, cost };
}

// ------------------------------------------------------------------ efeitos
//
// Armadilha 1: nenhum ganho multiplicativo pode chegar perto do fator de custo
// (1,10), senão o retorno por nível fica constante e a taxa explode.

export const moveSpeed = (lv) => TUNING.speedBase * Math.pow(TUNING.speedStep, lv);
export const damage = (lv) => TUNING.damageBase * Math.pow(TUNING.damageStep, lv);
export const reach = (lv) => TUNING.reachBase + TUNING.reachStep * lv;
export const backpack = (lv) => TUNING.backpackBase + TUNING.backpackStep * lv;
export const heroCount = (lv) => 1 + lv;

export const spawnInterval = (lv) =>
  Math.max(TUNING.spawnFloorSec, TUNING.spawnBase * Math.pow(TUNING.spawnStep, lv));

export const roomSize = (lv) => ({
  w: TUNING.roomW + TUNING.roomStepW * lv,
  h: TUNING.roomH + TUNING.roomStepH * lv,
});

export const tacticFactor = (lv) =>
  TUNING.tacticFactor[Math.min(lv, TUNING.tacticFactor.length - 1)];

export function roomArea(tochaLv) {
  const r = roomSize(tochaLv);
  return r.w * r.h;
}

// Sala maior comporta mais inimigos ao mesmo tempo: a oferta cresce com a raiz
// da área, não com a área, senão a Tocha viraria o único upgrade que importa.
export const spawnDensity = (tochaLv) => Math.sqrt(roomArea(tochaLv) / baseArea());

export const effectiveSpawnInterval = (u) => spawnInterval(u.isca) / spawnDensity(u.tocha);

// Teto de inimigos vivos. Existe para o campo não crescer sem limite quando a
// produção passa o consumo — com o teto batido, a taxa cai para o consumo, que
// é exatamente o que o min() da fórmula já diz.
export const enemyCap = (tochaLv) => Math.round(TUNING.enemyCapBase * spawnDensity(tochaLv));

// ------------------------------------------------------------------- andares
//
// Valor cresce mais rápido que vida de propósito: andar novo é salto, não
// parede. O custo para descer cresce mais rápido que o valor, e é isso que
// trava a progressão e dá razão para o prestígio existir.

export const enemyValue = (floor) => Math.pow(TUNING.valueStep, floor - 1);
export const enemyHp = (floor) => TUNING.hpBase * Math.pow(TUNING.hpStep, floor - 1);
export const descendCost = (floor) => TUNING.descendBase * Math.pow(TUNING.descendStep, floor - 1);

// ----------------------------------------------------------------- prestígio
//
// Armadilha 2: a essência é calculada pelo andar alcançado, nunca pelo ouro.
// Ela multiplica o ouro; premiar ouro criaria realimentação sem limite.

export function essenceGain(floor) {
  if (floor < TUNING.prestigeFloor) return 0;
  return Math.floor(TUNING.essenceBase * Math.pow(TUNING.essenceStep, floor - TUNING.prestigeFloor));
}

export const essenceMultiplier = (essence) => 1 + essence * TUNING.essencePerPoint;

export function canPrestige(floor, essence) {
  const gain = essenceGain(floor);
  return gain >= TUNING.prestigeMin && gain >= TUNING.prestigeRatio * essence;
}

// -------------------------------------------------------------- ouro/segundo
//
// Estimativa analítica do ciclo do herói. É o que alimenta o ganho offline e,
// na fase online, a validação no servidor. Não é a simulação — é o modelo dela.

export function goldPerSecond({ upgrades, floor, essence }) {
  const room = roomSize(upgrades.tocha);
  const mid = (room.w + room.h) / 2;

  const vel = moveSpeed(upgrades.botas);
  const dps = damage(upgrades.lamina);
  const cap = backpack(upgrades.mochila);
  const heroes = heroCount(upgrades.companheiro);

  const distTarget = Math.max(0, tacticFactor(upgrades.tatica) * mid - reach(upgrades.alcance));
  const distChest = 0.5 * mid;

  const timePerEnemy = distTarget / vel + enemyHp(floor) / dps;
  const cycleTime = cap * timePerEnemy + distChest / vel + DEPOSIT_TIME;

  const consumption = (heroes * cap) / cycleTime;              // inimigos/s
  const production = spawnDensity(upgrades.tocha) / spawnInterval(upgrades.isca);

  // O min() é o gargalo: se o consumo passa a produção, o campo fica vazio e
  // os heróis esperam. É aí que Isca e Tocha viram compras necessárias.
  return Math.min(consumption, production) * enemyValue(floor) * essenceMultiplier(essence);
}

// Qual dos dois lados está segurando a taxa. A interface mostra isso, porque é
// a informação que faz o jogador entender o que comprar.
export function bottleneck({ upgrades, floor }) {
  const room = roomSize(upgrades.tocha);
  const mid = (room.w + room.h) / 2;
  const distTarget = Math.max(0, tacticFactor(upgrades.tatica) * mid - reach(upgrades.alcance));
  const timePerEnemy = distTarget / moveSpeed(upgrades.botas) + enemyHp(floor) / damage(upgrades.lamina);
  const cap = backpack(upgrades.mochila);
  const cycleTime = cap * timePerEnemy + (0.5 * mid) / moveSpeed(upgrades.botas) + DEPOSIT_TIME;
  const consumption = (heroCount(upgrades.companheiro) * cap) / cycleTime;
  const production = spawnDensity(upgrades.tocha) / spawnInterval(upgrades.isca);
  return { consumption, production, limitedBy: consumption <= production ? 'herois' : 'spawn' };
}

// -------------------------------------------------------------- ganho offline

export const OFFLINE_CAP = 4 * 3600;
export const OFFLINE_RATE = 0.5;

// A taxa usada é a congelada no fechamento, não a recalculada agora. É isso que
// impede comprar tudo, fechar e reabrir para colher a taxa nova.
export function offlineGain(goldPerSec, seconds) {
  const capped = Math.min(Math.max(0, seconds), OFFLINE_CAP);
  return { seconds: capped, gold: goldPerSec * capped * OFFLINE_RATE };
}
