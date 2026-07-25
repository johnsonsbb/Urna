import { getArena } from '../data/arenas.js';
import { getMonster } from '../data/monsters.js';
import { getSpell } from '../data/spells.js';
import { applyArmor, spellScale } from '../formulas.js';
import { Rng } from '../rng.js';
import type {
  ArenaDef,
  AreaPattern,
  Combatant,
  Facing,
  Fx,
  FxKind,
  LogEntry,
  SimState,
  SpellDef,
  TickResult,
  Vec2,
} from '../types.js';
import {
  chebyshev,
  facingFrom,
  nearestFree,
  occupancy,
  parseArena,
  stepAway,
  stepToward,
  tileKey,
  type Grid,
} from './grid.js';
import { createMonster, createPartyMember, type PartyConfig } from './spawn.js';

/** Passo fixo da simulação. Tudo é resolvido em múltiplos disto. */
export const TICK_MS = 100;

const CORPSE_MS = 5000;
const WAVE_BREAK_MS = 3200;
const WAVE_START_MS = 1200;
const WIPE_RECOVERY_MS = 4000;
const POTION_CD_MS = 1000;
/** Atraso no ataque básico depois de conjurar, para não sair tudo no mesmo tick. */
const CAST_RECOVERY_MS = 700;

interface Ctx {
  state: SimState;
  grid: Grid;
  arena: ArenaDef;
  rng: Rng;
  fx: Fx[];
  log: LogEntry[];
}

// Ids de efeito visual não influenciam a simulação — servem de chave no render.
let fxCounter = 0;

const gridCache = new Map<string, Grid>();

export function gridFor(arenaId: string): Grid {
  let grid = gridCache.get(arenaId);
  if (!grid) {
    grid = parseArena(getArena(arenaId));
    gridCache.set(arenaId, grid);
  }
  return grid;
}

export interface SimOptions {
  arenaId: string;
  party: PartyConfig[];
  seed?: number;
  waveIndex?: number;
}

export function createSim(options: SimOptions): SimState {
  const grid = gridFor(options.arenaId);
  const combatants: Combatant[] = [];
  let nextId = 1;

  options.party.slice(0, 3).forEach((config, index) => {
    const spawn = grid.partySpawns[index] ?? grid.partySpawns[0] ?? { x: 1, y: 1 };
    combatants.push(createPartyMember(config, `p${nextId++}`, spawn));
  });

  return {
    timeMs: 0,
    arenaId: options.arenaId,
    waveIndex: options.waveIndex ?? 0,
    waveState: 'preparando',
    waveTimerMs: WAVE_START_MS,
    combatants,
    rngSeed: options.seed ?? 0x5eed,
    nextId,
    totals: { kills: 0, wavesCleared: 0, exp: 0, gold: 0, potionsUsed: 0 },
  };
}

/** Um passo de TICK_MS. Muta o estado e devolve o que aconteceu. */
export function stepSim(state: SimState): TickResult {
  const ctx: Ctx = {
    state,
    grid: gridFor(state.arenaId),
    arena: getArena(state.arenaId),
    rng: new Rng(state.rngSeed),
    fx: [],
    log: [],
  };

  state.timeMs += TICK_MS;
  advanceWaveState(ctx);

  if (state.waveState === 'lutando') {
    regenerate(ctx);
    for (const combatant of state.combatants) {
      if (!combatant.alive) {
        combatant.corpseMs -= TICK_MS;
        continue;
      }
      tickCooldowns(combatant);
      advanceMovement(combatant);
      act(ctx, combatant);
    }
    checkWaveEnd(ctx);
  } else {
    for (const combatant of state.combatants) {
      if (!combatant.alive) combatant.corpseMs -= TICK_MS;
    }
    if (state.waveState === 'limpa' || state.waveState === 'preparando') {
      regenerate(ctx);
      regroup(ctx);
    }
  }

  // Corpos de criatura somem; personagens do grupo ficam para reviver.
  state.combatants = state.combatants.filter(
    (c) => c.side === 'party' || c.alive || c.corpseMs > 0,
  );
  state.rngSeed = ctx.rng.seed;

  // Todos os efeitos deste passo acontecem no mesmo instante simulado.
  for (const effect of ctx.fx) effect.tMs = state.timeMs;

  return { fx: ctx.fx, log: ctx.log };
}

/**
 * Avança a simulação por um intervalo.
 *
 * `collect: false` descarta efeitos e log — é o modo usado no catch-up offline,
 * onde só interessa o estado final e ninguém vai assistir aos 400 mil eventos.
 */
export function runSim(state: SimState, ms: number, collect = true): TickResult {
  const fx: Fx[] = [];
  const log: LogEntry[] = [];
  const steps = Math.floor(ms / TICK_MS);

  for (let i = 0; i < steps; i++) {
    const result = stepSim(state);
    if (collect) {
      fx.push(...result.fx);
      log.push(...result.log);
    }
  }

  return { fx, log };
}

// ---------------------------------------------------------------------------
// Ondas
// ---------------------------------------------------------------------------

function advanceWaveState(ctx: Ctx): void {
  const { state, arena } = ctx;

  if (state.waveState === 'preparando') {
    state.waveTimerMs -= TICK_MS;
    if (state.waveTimerMs <= 0) spawnWave(ctx);
    return;
  }

  if (state.waveState === 'limpa') {
    state.waveTimerMs -= TICK_MS;
    if (state.waveTimerMs > 0) return;

    state.waveIndex++;
    if (state.waveIndex >= arena.waves.length) {
      state.waveIndex = 0;
      pushLog(ctx, 'onda', `${arena.name} concluído! Recomeçando o ciclo.`);
    }
    state.waveState = 'preparando';
    state.waveTimerMs = WAVE_START_MS;
    return;
  }

  if (state.waveState === 'derrota') {
    state.waveTimerMs -= TICK_MS;
    if (state.waveTimerMs <= 0) recoverParty(ctx);
  }
}

function spawnWave(ctx: Ctx): void {
  const { state, grid, arena } = ctx;
  const wave = arena.waves[state.waveIndex];
  if (!wave) return;

  const occupied = occupancy(state.combatants);
  let slot = 0;

  for (const group of wave.spawns) {
    for (let i = 0; i < group.count; i++) {
      const anchor =
        grid.monsterSpawns[slot % Math.max(1, grid.monsterSpawns.length)] ??
        { x: grid.width - 2, y: 1 };
      slot++;

      const pos = nearestFree(grid, occupied, anchor);
      if (!pos) continue;

      occupied.add(tileKey(pos.x, pos.y));
      state.combatants.push(createMonster(group.monsterId, `m${state.nextId++}`, pos));
    }
  }

  state.waveState = 'lutando';
  const label = wave.boss ? 'BOSS' : `Onda ${state.waveIndex + 1}/${arena.waves.length}`;
  pushLog(ctx, 'onda', `${label} — ${arena.name}`);
  if (wave.boss) {
    ctx.fx.push(makeFx('aviso', { x: Math.floor(grid.width / 2), y: 1 }, {
      text: 'O Senhor do Covil desperta',
      durationMs: 2200,
    }));
  }
}

function checkWaveEnd(ctx: Ctx): void {
  const { state, arena } = ctx;
  const partyAlive = state.combatants.some((c) => c.side === 'party' && c.alive);
  const monstersAlive = state.combatants.some((c) => c.side === 'monster' && c.alive);

  if (!partyAlive) {
    state.waveState = 'derrota';
    state.waveTimerMs = WIPE_RECOVERY_MS;
    pushLog(ctx, 'aviso', 'O grupo foi derrotado e recuou.');
    return;
  }

  if (!monstersAlive) {
    state.waveState = 'limpa';
    state.waveTimerMs = WAVE_BREAK_MS;
    state.totals.wavesCleared++;

    // Um fôlego entre ondas — senão o grupo derrete por acúmulo, não por dificuldade.
    for (const c of state.combatants) {
      if (c.side !== 'party' || !c.alive) continue;
      c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.25));
      c.mana = Math.min(c.maxMana, c.mana + Math.floor(c.maxMana * 0.25));
    }

    pushLog(
      ctx,
      'onda',
      `Onda ${state.waveIndex + 1}/${arena.waves.length} concluída!`,
    );
  }
}

function recoverParty(ctx: Ctx): void {
  const { state, grid } = ctx;
  state.combatants = state.combatants.filter((c) => c.side === 'party');

  state.combatants.forEach((c, index) => {
    c.alive = true;
    c.hp = c.maxHp;
    c.mana = c.maxMana;
    c.corpseMs = 0;
    c.moveFrom = null;
    c.moveProgress = 0;
    c.targetId = null;
    c.attackCdMs = 0;
    c.spellCdMs = {};
    c.pos = { ...(grid.partySpawns[index] ?? grid.partySpawns[0] ?? { x: 1, y: 1 }) };
  });

  state.waveState = 'preparando';
  state.waveTimerMs = WAVE_START_MS + 400;
  pushLog(ctx, 'onda', 'O grupo se recompôs e voltou à arena.');
}

// ---------------------------------------------------------------------------
// Comportamento por combatente
// ---------------------------------------------------------------------------

function tickCooldowns(c: Combatant): void {
  c.attackCdMs = Math.max(0, c.attackCdMs - TICK_MS);
  c.potionCdMs = Math.max(0, c.potionCdMs - TICK_MS);
  for (const id of Object.keys(c.spellCdMs)) {
    c.spellCdMs[id] = Math.max(0, (c.spellCdMs[id] ?? 0) - TICK_MS);
  }
}

function advanceMovement(c: Combatant): void {
  if (!c.moveFrom) return;
  c.moveProgress += TICK_MS / Math.max(TICK_MS, c.moveDurationMs);
  if (c.moveProgress >= 1) {
    c.moveFrom = null;
    c.moveProgress = 0;
  }
}

function regenerate(ctx: Ctx): void {
  if (ctx.state.timeMs % 1000 !== 0) return;
  for (const c of ctx.state.combatants) {
    if (!c.alive || c.side !== 'party') continue;
    c.hp = Math.min(c.maxHp, c.hp + 1 + Math.floor(c.level * 0.15));
    c.mana = Math.min(c.maxMana, c.mana + 2 + Math.floor(c.magicLevel * 0.8));
  }
}

/**
 * Entre as ondas o grupo volta para a formação.
 *
 * Sem isto o combate migra para o canto onde as criaturas nascem e vai ficando
 * encavalado ali — o grupo termina uma onda colado no spawn e a seguinte
 * aparece em cima dele. Voltar à formação mantém a luta no meio da arena e dá
 * vida ao intervalo, em vez de três bonecos parados.
 */
function regroup(ctx: Ctx): void {
  const { state, grid } = ctx;
  const anchorX = Math.floor(grid.width * 0.32);
  const centerY = Math.floor(grid.height / 2);
  const members = state.combatants.filter((c) => c.side === 'party');

  members.forEach((c, index) => {
    if (!c.alive) return;
    tickCooldowns(c);
    advanceMovement(c);
    if (c.moveFrom) return;

    const lineOffset = c.doctrine.line === 'frente' ? 1 : c.doctrine.line === 'tras' ? -1 : 0;
    const spot = {
      x: anchorX + lineOffset,
      y: centerY + Math.round(index - (members.length - 1) / 2),
    };

    if (chebyshev(c.pos, spot) === 0) {
      c.facing = 'leste';
      return;
    }

    const step = stepToward(grid, occupancy(state.combatants, c.id), c.pos, spot);
    if (step) startMove(c, step);
  });
}

function act(ctx: Ctx, c: Combatant): void {
  if (drinkPotionIfNeeded(ctx, c)) return;
  if (healAllyIfNeeded(ctx, c)) return;

  const target = pickTarget(ctx, c);
  if (!target) {
    c.targetId = null;
    return;
  }

  c.targetId = target.id;
  const distance = chebyshev(c.pos, target.pos);
  c.facing = facingFrom(c.pos, target.pos);

  const spell = pickDamageSpell(c, distance);
  if (spell) {
    castSpell(ctx, c, spell, target.pos);
    return;
  }

  if (distance <= c.attackRange && c.attackCdMs <= 0) {
    basicAttack(ctx, c, target);
    return;
  }

  if (c.moveFrom) return;

  const desired = Math.min(c.doctrine.engageDistance, c.attackRange);
  const occupied = occupancy(ctx.state.combatants, c.id);

  if (distance > desired) {
    const step = stepToward(ctx.grid, occupied, c.pos, target.pos);
    if (step) startMove(c, step);
  } else if (distance < desired) {
    const step = stepAway(ctx.grid, occupied, c.pos, target.pos);
    if (step) startMove(c, step);
  }
}

function startMove(c: Combatant, to: Vec2): void {
  c.moveFrom = { ...c.pos };
  c.facing = facingFrom(c.pos, to);
  c.pos = to;
  c.moveProgress = 0;
  c.moveDurationMs = c.moveSpeedMs;
}

function drinkPotionIfNeeded(ctx: Ctx, c: Combatant): boolean {
  if (c.potionCdMs > 0) return false;

  const hpPct = (c.hp / c.maxHp) * 100;
  if (hpPct < c.doctrine.potionBelowPct && c.potions > 0) {
    c.potions--;
    c.potionCdMs = POTION_CD_MS;
    ctx.state.totals.potionsUsed++;
    const healed = Math.min(c.maxHp - c.hp, Math.floor(c.maxHp * 0.28));
    c.hp += healed;
    ctx.fx.push(makeFx('cura', c.pos, { value: healed, durationMs: 900 }));
    return false; // beber não gasta o turno
  }

  if (c.maxMana > 0 && c.manaPotions > 0) {
    const manaPct = (c.mana / c.maxMana) * 100;
    if (manaPct < c.doctrine.manaPotionBelowPct) {
      c.manaPotions--;
      c.potionCdMs = POTION_CD_MS;
      ctx.state.totals.potionsUsed++;
      c.mana = Math.min(c.maxMana, c.mana + Math.floor(c.maxMana * 0.3));
      ctx.fx.push(makeFx('efeito', c.pos, { effect: 'mana', durationMs: 500 }));
    }
  }

  return false;
}

function healAllyIfNeeded(ctx: Ctx, c: Combatant): boolean {
  if (c.doctrine.healAllyBelowPct <= 0) return false;

  let worst: Combatant | null = null;
  let worstPct = c.doctrine.healAllyBelowPct;
  let hurtCount = 0;

  for (const ally of ctx.state.combatants) {
    if (!ally.alive || ally.side !== c.side) continue;
    const pct = (ally.hp / ally.maxHp) * 100;
    if (pct >= c.doctrine.healAllyBelowPct) continue;
    hurtCount++;
    if (pct < worstPct) {
      worstPct = pct;
      worst = ally;
    }
  }

  if (!worst) return false;

  const spell = pickHealSpell(c, worst, hurtCount);
  if (!spell) return false;

  castSpell(ctx, c, spell, worst.pos);
  return true;
}

function pickTarget(ctx: Ctx, c: Combatant): Combatant | null {
  let best: Combatant | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const enemy of ctx.state.combatants) {
    if (!enemy.alive || enemy.side === c.side) continue;

    const distance = chebyshev(c.pos, enemy.pos);
    let score: number;
    switch (c.doctrine.targetPriority) {
      case 'mais-fraco':
        score = enemy.hp * 1000 + distance;
        break;
      case 'mais-forte':
        score = -enemy.hp * 1000 + distance;
        break;
      case 'conjurador':
        score = (enemy.maxMana > 0 ? 0 : 1_000_000) + distance;
        break;
      default:
        score = distance * 100_000 + enemy.hp;
    }

    // Empate resolvido pelo id: mesma escolha em qualquer máquina.
    if (score < bestScore || (score === bestScore && best !== null && enemy.id < best.id)) {
      best = enemy;
      bestScore = score;
    }
  }

  return best;
}

function pickDamageSpell(c: Combatant, distance: number): SpellDef | null {
  for (const id of c.spells) {
    const spell = getSpell(id);
    if (spell.kind !== 'dano') continue;
    if (c.level < spell.levelReq) continue;
    if ((c.spellCdMs[id] ?? 0) > 0) continue;
    if (c.mana < spell.manaCost) continue;
    if (distance > spell.range) continue;
    return spell;
  }
  return null;
}

function pickHealSpell(
  c: Combatant,
  target: Combatant,
  hurtCount: number,
): SpellDef | null {
  const candidates = c.spells
    .map(getSpell)
    .filter((spell) => spell.kind === 'cura')
    // Com dois ou mais feridos, a cura em área compensa; com um só, a simples.
    .sort((a, b) =>
      hurtCount >= 2 ? areaSize(b.area) - areaSize(a.area) : areaSize(a.area) - areaSize(b.area),
    );

  for (const spell of candidates) {
    if (c.level < spell.levelReq) continue;
    if ((c.spellCdMs[spell.id] ?? 0) > 0) continue;
    if (c.mana < spell.manaCost) continue;
    if (chebyshev(c.pos, target.pos) > spell.range) continue;
    return spell;
  }
  return null;
}

function areaSize(area: AreaPattern): number {
  let count = 0;
  for (const row of area) for (const cell of row) if (cell !== 0) count++;
  return count;
}

// ---------------------------------------------------------------------------
// Ataques e magias
// ---------------------------------------------------------------------------

function basicAttack(ctx: Ctx, c: Combatant, target: Combatant): void {
  c.attackCdMs = c.attackSpeedMs;
  if (c.attackRange > 1) {
    ctx.fx.push(makeFx('projetil', c.pos, { to: target.pos, effect: 'flecha', durationMs: 200 }));
  }
  const raw = ctx.rng.int(c.attackMin, c.attackMax);
  applyDamage(ctx, c, target, raw, false);
}

function castSpell(ctx: Ctx, c: Combatant, spell: SpellDef, targetPos: Vec2): void {
  c.mana -= spell.manaCost;
  c.spellCdMs[spell.id] = spell.cooldownMs;
  c.attackCdMs = Math.max(c.attackCdMs, CAST_RECOVERY_MS);
  c.facing = facingFrom(c.pos, targetPos);

  // Fala curta de propósito: com o grupo conjurando junto, textos longos se
  // sobrepõem e a arena vira uma parede de letras.
  ctx.fx.push(makeFx('fala', c.pos, { text: spell.words, side: c.side, durationMs: 900 }));
  if (spell.missile) {
    ctx.fx.push(
      makeFx('projetil', c.pos, { to: targetPos, effect: spell.missile, durationMs: 220 }),
    );
  }

  const center = spell.origin === 'conjurador' ? c.pos : targetPos;
  const tiles = resolveArea(spell, center, c.facing);
  const scale = spellScale(c.level, c.magicLevel);

  for (const tile of tiles) {
    ctx.fx.push(makeFx('efeito', tile, { effect: spell.effect, durationMs: 420 }));

    const victim = livingAt(ctx.state, tile);
    if (!victim) continue;

    if (spell.kind === 'dano' && victim.side !== c.side) {
      const raw = Math.floor(ctx.rng.int(spell.baseMin, spell.baseMax) * scale);
      applyDamage(ctx, c, victim, raw, true);
    } else if (spell.kind === 'cura' && victim.side === c.side) {
      const amount = Math.floor(ctx.rng.int(spell.baseMin, spell.baseMax) * scale);
      const applied = Math.min(amount, victim.maxHp - victim.hp);
      if (applied > 0) {
        victim.hp += applied;
        c.healingDone += applied;
        ctx.fx.push(makeFx('cura', victim.pos, { value: applied, durationMs: 900 }));
      }
    }
  }
}

function applyDamage(
  ctx: Ctx,
  source: Combatant,
  victim: Combatant,
  raw: number,
  magical: boolean,
): void {
  // Armadura reduz apenas dano físico, como no Tibia.
  const damage = magical ? Math.max(1, raw) : applyArmor(raw, victim.armor, ctx.rng.next());

  victim.hp -= damage;
  victim.damageTaken += damage;
  source.damageDone += damage;
  ctx.fx.push(
    makeFx('dano', victim.pos, {
      value: damage,
      side: victim.side,
      entityId: victim.id,
      durationMs: 900,
    }),
  );

  if (victim.hp <= 0) kill(ctx, victim);
}

function kill(ctx: Ctx, victim: Combatant): void {
  victim.hp = 0;
  victim.alive = false;
  victim.corpseMs = CORPSE_MS;
  victim.targetId = null;
  victim.moveFrom = null;
  ctx.fx.push(makeFx('morte', victim.pos, { durationMs: 600 }));

  if (victim.side === 'monster' && victim.monsterId) {
    const def = getMonster(victim.monsterId);
    ctx.state.totals.kills++;
    ctx.state.totals.exp += def.exp;

    const gold = ctx.rng.int(def.gold[0], def.gold[1]);
    if (gold > 0) {
      ctx.state.totals.gold += gold;
      ctx.fx.push(makeFx('gold', victim.pos, { value: gold, durationMs: 1100 }));
    }
    pushLog(ctx, 'combate', `${def.name} morreu. +${def.exp} exp`);
  } else {
    pushLog(ctx, 'morte', `${victim.name} tombou!`);
  }
}

// ---------------------------------------------------------------------------
// Área de magia
// ---------------------------------------------------------------------------

/**
 * Converte a matriz da magia em tiles do mundo.
 *
 * Quando a origem é o conjurador, a matriz é rotacionada conforme a direção
 * que ele encara — é assim que uma onda em cone aponta para o lado certo.
 */
export function resolveArea(spell: SpellDef, center: Vec2, facing: Facing): Vec2[] {
  const pattern = spell.origin === 'conjurador' ? rotatePattern(spell.area, facing) : spell.area;

  let originX = 0;
  let originY = 0;
  let found = false;

  for (let y = 0; y < pattern.length && !found; y++) {
    const row = pattern[y]!;
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 2) {
        originX = x;
        originY = y;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    originX = Math.floor((pattern[0]?.length ?? 1) / 2);
    originY = Math.floor(pattern.length / 2);
  }

  const tiles: Vec2[] = [];
  for (let y = 0; y < pattern.length; y++) {
    const row = pattern[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x] ?? 0;
      if (cell === 0) continue;
      // O tile do próprio conjurador não é atingido pela própria magia.
      if (cell === 2 && spell.origin === 'conjurador') continue;
      tiles.push({ x: center.x + (x - originX), y: center.y + (y - originY) });
    }
  }

  return tiles;
}

/** Rotaciona a matriz. A orientação base das matrizes é 'leste'. */
export function rotatePattern(pattern: AreaPattern, facing: Facing): AreaPattern {
  if (facing === 'leste') return pattern;
  if (facing === 'oeste') return pattern.map((row) => [...row].reverse());

  const rows = pattern.length;
  const cols = pattern[0]?.length ?? 0;
  const out: number[][] = [];

  if (facing === 'sul') {
    for (let y = 0; y < cols; y++) {
      const row: number[] = [];
      for (let x = 0; x < rows; x++) row.push(pattern[rows - 1 - x]?.[y] ?? 0);
      out.push(row);
    }
  } else {
    for (let y = 0; y < cols; y++) {
      const row: number[] = [];
      for (let x = 0; x < rows; x++) row.push(pattern[x]?.[cols - 1 - y] ?? 0);
      out.push(row);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function livingAt(state: SimState, pos: Vec2): Combatant | null {
  for (const c of state.combatants) {
    if (c.alive && c.pos.x === pos.x && c.pos.y === pos.y) return c;
  }
  return null;
}

function makeFx(
  kind: FxKind,
  pos: Vec2,
  extra: Partial<Omit<Fx, 'id' | 'kind' | 'pos' | 'tMs'>> = {},
): Fx {
  return {
    id: ++fxCounter,
    kind,
    tMs: 0,
    durationMs: 600,
    pos: { ...pos },
    ...extra,
  };
}

function pushLog(ctx: Ctx, kind: LogEntry['kind'], text: string): void {
  ctx.log.push({ tMs: ctx.state.timeMs, kind, text });
}

export type { PartyConfig };
