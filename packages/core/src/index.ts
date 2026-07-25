/**
 * @covil/core — engine determinística do Covil.
 *
 * A mesma simulação roda no servidor (autoritativa, comprimindo horas em
 * milissegundos no catch-up offline) e no cliente (preditiva, a 60fps). Dado o
 * mesmo estado inicial e a mesma semente, o resultado é idêntico nos dois.
 */

export * from './types.js';
export * from './formulas.js';
export { Rng, randomSeed } from './rng.js';

export { VOCATIONS, VOCATION_IDS, getVocation } from './data/vocations.js';
export { MONSTERS, getMonster } from './data/monsters.js';
export { SPELLS, getSpell } from './data/spells.js';
export { ARENAS, ARENA_IDS, getArena } from './data/arenas.js';

export {
  chebyshev,
  facingFrom,
  isWalkable,
  nearestFree,
  occupancy,
  parseArena,
  stepAway,
  stepToward,
  terrainAt,
  tileKey,
  type Grid,
  type Terrain,
} from './sim/grid.js';

export {
  createMonster,
  createPartyMember,
  type PartyConfig,
} from './sim/spawn.js';

export {
  TICK_MS,
  createSim,
  gridFor,
  resolveArea,
  rotatePattern,
  runSim,
  stepSim,
  type SimOptions,
} from './sim/tick.js';
