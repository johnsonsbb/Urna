import type { ArenaDef, Combatant, Facing, Vec2 } from '../types.js';

export type Terrain = 'chao' | 'parede' | 'agua' | 'decoracao';

export interface Grid {
  width: number;
  height: number;
  terrain: Terrain[];
  partySpawns: Vec2[];
  monsterSpawns: Vec2[];
}

/** Vizinhos em ordem fixa — a ordem importa para a simulação ser determinística. */
const NEIGHBORS: readonly Vec2[] = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
];

export function parseArena(def: ArenaDef): Grid {
  const terrain: Terrain[] = new Array(def.width * def.height).fill('parede');
  const partySpawns: Vec2[] = [];
  const monsterSpawns: Vec2[] = [];

  for (let y = 0; y < def.height; y++) {
    const row = def.layout[y] ?? '';
    for (let x = 0; x < def.width; x++) {
      const char = row[x] ?? '#';
      const index = y * def.width + x;
      switch (char) {
        case '#':
          terrain[index] = 'parede';
          break;
        case '~':
          terrain[index] = 'agua';
          break;
        case ',':
          terrain[index] = 'decoracao';
          break;
        case 'P':
          terrain[index] = 'chao';
          partySpawns.push({ x, y });
          break;
        case 'M':
          terrain[index] = 'chao';
          monsterSpawns.push({ x, y });
          break;
        default:
          terrain[index] = 'chao';
      }
    }
  }

  return { width: def.width, height: def.height, terrain, partySpawns, monsterSpawns };
}

export function terrainAt(grid: Grid, x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return 'parede';
  return grid.terrain[y * grid.width + x] ?? 'parede';
}

export function isWalkable(grid: Grid, x: number, y: number): boolean {
  const t = terrainAt(grid, x, y);
  return t === 'chao' || t === 'decoracao';
}

/** Chave de tile para os conjuntos de ocupação. */
export const tileKey = (x: number, y: number) => y * 1000 + x;

const key = tileKey;

/** Tiles ocupados por combatentes vivos, para evitar dois no mesmo lugar. */
export function occupancy(combatants: readonly Combatant[], ignoreId?: string): Set<number> {
  const set = new Set<number>();
  for (const c of combatants) {
    if (!c.alive || c.id === ignoreId) continue;
    set.add(key(c.pos.x, c.pos.y));
    // Quem está andando reserva o tile de destino.
    if (c.moveFrom) set.add(key(c.moveFrom.x, c.moveFrom.y));
  }
  return set;
}

export function isFree(grid: Grid, occupied: Set<number>, x: number, y: number): boolean {
  return isWalkable(grid, x, y) && !occupied.has(key(x, y));
}

export function chebyshev(a: Vec2, b: Vec2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Um passo em direção a um alvo, evitando parede, água e outros combatentes.
 *
 * É guloso em vez de A*: a arena é uma sala aberta com poucos obstáculos, e o
 * custo por tick importa — o servidor precisa comprimir horas de simulação no
 * catch-up offline. Quando o passo ideal está bloqueado, tenta os vizinhos
 * adjacentes antes de desistir, o que resolve os casos de contorno de poça e
 * de aglomeração sem o custo de um pathfinder completo.
 */
export function stepToward(
  grid: Grid,
  occupied: Set<number>,
  from: Vec2,
  to: Vec2,
): Vec2 | null {
  return pickStep(grid, occupied, from, (candidate) => chebyshev(candidate, to));
}

/** Um passo se afastando do alvo — usado por quem mantém distância. */
export function stepAway(
  grid: Grid,
  occupied: Set<number>,
  from: Vec2,
  to: Vec2,
): Vec2 | null {
  return pickStep(grid, occupied, from, (candidate) => -chebyshev(candidate, to));
}

function pickStep(
  grid: Grid,
  occupied: Set<number>,
  from: Vec2,
  cost: (candidate: Vec2) => number,
): Vec2 | null {
  let best: Vec2 | null = null;
  let bestCost = cost(from);
  let bestIndex = -1;

  for (let i = 0; i < NEIGHBORS.length; i++) {
    const offset = NEIGHBORS[i]!;
    const candidate = { x: from.x + offset.x, y: from.y + offset.y };
    if (!isFree(grid, occupied, candidate.x, candidate.y)) continue;

    const candidateCost = cost(candidate);
    // Empate resolvido pelo índice do vizinho: sempre a mesma escolha.
    if (candidateCost < bestCost || (candidateCost === bestCost && bestIndex === -1)) {
      best = candidate;
      bestCost = candidateCost;
      bestIndex = i;
    }
  }

  return best;
}

export function facingFrom(from: Vec2, to: Vec2): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'leste' : 'oeste';
  return dy >= 0 ? 'sul' : 'norte';
}

/** Tile livre mais próximo de uma origem, em busca por anéis crescentes. */
export function nearestFree(
  grid: Grid,
  occupied: Set<number>,
  origin: Vec2,
  maxRadius = 6,
): Vec2 | null {
  if (isFree(grid, occupied, origin.x, origin.y)) return origin;

  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = origin.x + dx;
        const y = origin.y + dy;
        if (isFree(grid, occupied, x, y)) return { x, y };
      }
    }
  }
  return null;
}
