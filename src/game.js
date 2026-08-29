// game.js — estado do mundo e o tick que o avança.
//
// REGRA: este arquivo não pode referenciar document, window, canvas ou
// localStorage. Recebe e devolve dados puros, e o estado é serializável em
// JSON sem perda. É essa lógica que vai rodar no servidor na fase 5.

import * as B from './balance.js';

// --------------------------------------------------------------------- rng
//
// Determinístico e serializável: a semente vive no estado. Mesma semente,
// mesma partida — o que a fase 5 vai precisar para verificar progresso.

function rand(s) {
  let a = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ------------------------------------------------------------------- estado

export const SAVE_VERSION = 1;

export function createState(seed = (Date.now() & 0x7fffffff) || 1) {
  const s = {
    version: SAVE_VERSION,
    seed: seed | 0,
    floor: 1,
    gold: 0,
    essence: 0,
    upgrades: B.emptyUpgrades(),
    heroes: [],
    enemies: [],
    nextId: 1,
    spawnT: 0,
    stats: { kills: 0, deposits: 0, goldEver: 0, prestiges: 0, bestFloor: 1, playTime: 0, runTime: 0 },
  };
  syncHeroes(s);
  return s;
}

export const room = (s) => B.roomSize(s.upgrades.tocha);

export function chest(s) {
  const r = room(s);
  return { x: r.w / 2, y: r.h / 2 };
}

export const rate = (s) =>
  B.goldPerSecond({ upgrades: s.upgrades, floor: s.floor, essence: s.essence });

export const multiplier = (s) => B.essenceMultiplier(s.essence);

function newHero(s) {
  const c = chest(s);
  return { x: c.x, y: c.y, st: 'seek', tid: 0, carry: 0, loot: 0, dep: 0 };
}

// Mantém o número de heróis igual ao nível de Companheiro. Herói novo entra
// no baú, de mãos vazias.
export function syncHeroes(s) {
  const want = B.heroCount(s.upgrades.companheiro);
  while (s.heroes.length < want) s.heroes.push(newHero(s));
  if (s.heroes.length > want) {
    for (const h of s.heroes.splice(want)) s.gold += h.loot;  // ninguém perde o que carregava
  }
}

// --------------------------------------------------------------------- alvo

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function nearestTo(pool, p) {
  let best = null;
  let bd = Infinity;
  for (const e of pool) {
    const d = dist(e, p);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function releaseClaims(s, i) {
  for (const e of s.enemies) if (e.claim === i) e.claim = -1;
}

// A Tática é o único upgrade que muda comportamento em vez de número. Os
// níveis são cumulativos: o 4 continua fazendo o que o 3 faz.
export function pickTarget(s, i) {
  const h = s.heroes[i];
  const lv = s.upgrades.tatica;
  const alive = s.enemies;
  if (!alive.length) return null;

  // Nível 0: alvo aleatório, sem reserva — é o caos que os outros níveis curam.
  if (lv === 0) return alive[Math.floor(rand(s) * alive.length)];

  let pool = alive.filter((e) => e.claim === -1 || e.claim === i);
  if (!pool.length) return null;

  const c = chest(s);

  // Nível 2: descarta quem está longe demais do baú.
  if (lv >= 2) {
    const r = room(s);
    const limit = 0.6 * Math.hypot(r.w, r.h);
    const near = pool.filter((e) => dist(e, c) <= limit);
    if (near.length) pool = near;
  }

  // Nível 4: uma faixa vertical por herói, sem sobreposição. Se a faixa do
  // herói está vazia ele volta ao critério geral, senão ficaria parado olhando
  // para o próprio corredor — o que seria pior que o nível 3.
  if (lv >= 4) {
    const r = room(s);
    const lane = r.w / s.heroes.length;
    const mine = pool.filter((e) => e.x >= lane * i && e.x < lane * (i + 1));
    if (mine.length) pool = mine;
  }

  // Nível 3: com a mochila quase cheia, prefere quem está perto do baú.
  if (lv >= 3 && h.carry >= 0.7 * B.backpack(s.upgrades.mochila)) return nearestTo(pool, c);

  return nearestTo(pool, h);
}

// -------------------------------------------------------------------- spawn

function spawnOne(s) {
  const r = room(s);
  const c = chest(s);
  const m = B.SPAWN_MARGIN;
  let x = 0;
  let y = 0;
  for (let k = 0; k < 8; k++) {
    x = m + rand(s) * (r.w - 2 * m);
    y = m + rand(s) * (r.h - 2 * m);
    if (Math.hypot(x - c.x, y - c.y) > B.CHEST_CLEAR) break;
  }
  const hp = B.enemyHp(s.floor);
  s.enemies.push({ id: s.nextId++, x, y, hp, max: hp, claim: -1 });
}

function spawnStep(s, dt) {
  const cap = B.enemyCap(s.upgrades.tocha);
  const iv = Math.max(0.01, B.effectiveSpawnInterval(s.upgrades));
  s.spawnT -= dt;
  let guard = 0;
  while (s.spawnT <= 0 && guard++ < 500) {
    if (s.enemies.length >= cap) { s.spawnT = iv; break; }
    spawnOne(s);
    s.spawnT += iv;
  }
  if (s.spawnT < 0) s.spawnT = 0;
}

// --------------------------------------------------------------------- tick

function stepHero(s, i, dt, k) {
  const h = s.heroes[i];

  if (h.st === 'seek') {
    const t = pickTarget(s, i);
    if (!t) return;
    releaseClaims(s, i);
    if (s.upgrades.tatica > 0) t.claim = i;
    h.tid = t.id;
    h.st = 'move';
  }

  if (h.st === 'move' || h.st === 'attack') {
    const e = k.byId.get(h.tid);
    if (!e) { h.tid = 0; h.st = 'seek'; return; }

    const d = dist(h, e);
    if (d > k.reach) {
      const step = Math.min(k.speed * dt, d);
      h.x += ((e.x - h.x) / d) * step;
      h.y += ((e.y - h.y) / d) * step;
      h.st = dist(h, e) <= k.reach ? 'attack' : 'move';
      return;
    }

    h.st = 'attack';
    e.hp -= k.dps * dt;
    if (e.hp <= 0) {
      k.dead.add(e.id);
      k.byId.delete(e.id);
      s.stats.kills++;
      h.carry++;
      h.loot += k.value;
      h.tid = 0;
      // Mochila cheia ao matar: volta na hora, sem procurar mais um.
      h.st = h.carry >= k.cap ? 'return' : 'seek';
    }
    return;
  }

  if (h.st === 'return') {
    const d = dist(h, k.chest);
    if (d > k.reach) {
      const step = Math.min(k.speed * dt, d);
      h.x += ((k.chest.x - h.x) / d) * step;
      h.y += ((k.chest.y - h.y) / d) * step;
      return;
    }
    h.st = 'deposit';
    h.dep = B.DEPOSIT_TIME;
    return;
  }

  if (h.st === 'deposit') {
    h.dep -= dt;
    if (h.dep > 0) return;
    s.gold += h.loot;
    s.stats.goldEver += h.loot;
    s.stats.deposits++;
    h.loot = 0;
    h.carry = 0;
    h.st = 'seek';
  }
}

export function tick(s, dt = B.TICK) {
  s.stats.playTime += dt;
  s.stats.runTime += dt;

  spawnStep(s, dt);

  const u = s.upgrades;
  const byId = new Map();
  for (const e of s.enemies) byId.set(e.id, e);

  const k = {
    speed: B.moveSpeed(u.botas),
    dps: B.damage(u.lamina),
    reach: B.reach(u.alcance),
    cap: B.backpack(u.mochila),
    value: B.enemyValue(s.floor) * multiplier(s),
    chest: chest(s),
    byId,
    dead: new Set(),
  };

  for (let i = 0; i < s.heroes.length; i++) stepHero(s, i, dt, k);

  if (k.dead.size) s.enemies = s.enemies.filter((e) => !k.dead.has(e.id));
}

// ------------------------------------------------------------------ compras

export function buyUpgrade(s, id, count = 1) {
  if (!B.UPGRADE_IDS.includes(id)) return 0;
  const lv = s.upgrades[id];
  const cap = B.upgradeCap(id);

  const n = count === 'max'
    ? B.maxAffordable(id, lv, s.gold).count
    : Math.min(count, cap - lv);
  if (n <= 0) return 0;

  const cost = B.bulkCost(id, lv, n);
  if (cost > s.gold) return 0;

  s.gold -= cost;
  s.upgrades[id] += n;
  if (id === 'companheiro') syncHeroes(s);
  return n;
}

export function buyPreview(s, id, count = 1) {
  const lv = s.upgrades[id];
  const cap = B.upgradeCap(id);
  if (lv >= cap) return { count: 0, cost: 0, maxed: true };
  const n = count === 'max'
    ? B.maxAffordable(id, lv, s.gold).count
    : Math.min(count, cap - lv);
  const cost = B.bulkCost(id, lv, Math.max(n, count === 'max' ? 0 : n));
  return { count: n, cost, maxed: false, affordable: n > 0 && cost <= s.gold };
}

// ------------------------------------------------------------------- andares

export function descend(s) {
  const cost = B.descendCost(s.floor);
  if (s.gold < cost) return false;

  s.gold -= cost;
  s.floor++;
  if (s.floor > s.stats.bestFloor) s.stats.bestFloor = s.floor;

  // Andar novo, sala limpa. O que estava na mochila é creditado: ninguém deve
  // ser punido por descer no momento errado.
  s.enemies = [];
  s.spawnT = 0;
  for (const h of s.heroes) {
    s.gold += h.loot;
    Object.assign(h, newHero(s), { st: 'seek' });
  }
  return true;
}

// ----------------------------------------------------------------- prestígio

export function canPrestige(s) {
  return B.canPrestige(s.floor, s.essence);
}

export function prestigeGain(s) {
  return B.essenceGain(s.floor);
}

// Reseta ouro, upgrades e andar. Mantém essência, multiplicador e o nível de
// Tática — tática é conhecimento, e o jogador não deve perder um comportamento
// que já entendeu.
export function prestige(s) {
  if (!canPrestige(s)) return 0;

  const gain = prestigeGain(s);
  const keep = { essence: s.essence + gain, tatica: s.upgrades.tatica, stats: s.stats, seed: s.seed };

  const fresh = createState(keep.seed);
  fresh.essence = keep.essence;
  fresh.upgrades.tatica = keep.tatica;
  fresh.stats = keep.stats;
  fresh.stats.prestiges++;
  fresh.stats.runTime = 0;
  syncHeroes(fresh);

  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, fresh);
  return gain;
}

// ------------------------------------------------------------------- offline

// A taxa usada é a congelada no fechamento, nunca a de agora. É isso que impede
// comprar tudo, fechar e reabrir para colher a taxa nova.
export function applyOffline(s, seconds, frozenRate) {
  const gps = Number.isFinite(frozenRate) ? frozenRate : rate(s);
  const r = B.offlineGain(gps, seconds);
  s.gold += r.gold;
  s.stats.goldEver += r.gold;
  s.stats.playTime += r.seconds;
  return { ...r, rate: gps, capped: seconds > B.OFFLINE_CAP };
}
