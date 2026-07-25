import type { ArenaDef } from '../types.js';

/**
 * Arenas.
 *
 * Cada arena é uma sala fechada de um andar só — sem mapa aberto, sem
 * streaming, sem escadas. O layout é texto para ficar legível e editável:
 *   '.' chão   '#' parede   '~' água   ',' decoração (andável)
 *   'P' spawn do grupo      'M' spawn de criatura
 */

export const ARENAS: Record<string, ArenaDef> = {
  covil_raso: {
    id: 'covil_raso',
    name: 'Covil Raso',
    theme: 'caverna',
    width: 15,
    height: 11,
    layout: [
      '###############',
      '#..,.......,..#',
      '#.............#',
      '#P...........M#',
      '#P....~~~....M#',
      '#P....~~~....M#',
      '#P...........M#',
      '#.............#',
      '#..,.......,..#',
      '#.............#',
      '###############',
    ],
    waves: [
      { spawns: [{ monsterId: 'gato_selvagem', count: 2 }] },
      { spawns: [{ monsterId: 'gato_selvagem', count: 3 }] },
      {
        spawns: [
          { monsterId: 'gato_selvagem', count: 2 },
          { monsterId: 'espectro_menor', count: 1 },
        ],
      },
      { spawns: [{ monsterId: 'espectro_menor', count: 3 }] },
      {
        spawns: [
          { monsterId: 'goblin_saqueador', count: 2 },
          { monsterId: 'espectro_menor', count: 1 },
        ],
      },
      { spawns: [{ monsterId: 'goblin_saqueador', count: 3 }] },
      {
        spawns: [
          { monsterId: 'lobo_sombrio', count: 2 },
          { monsterId: 'goblin_saqueador', count: 2 },
        ],
      },
      { spawns: [{ monsterId: 'javali_sanguinario', count: 2 }] },
      {
        spawns: [
          { monsterId: 'javali_sanguinario', count: 3 },
          { monsterId: 'lobo_sombrio', count: 1 },
        ],
      },
      {
        spawns: [
          { monsterId: 'esqueleto_guerreiro', count: 2 },
          { monsterId: 'javali_sanguinario', count: 2 },
        ],
      },
      {
        boss: true,
        spawns: [
          { monsterId: 'senhor_do_covil', count: 1 },
          { monsterId: 'esqueleto_guerreiro', count: 2 },
        ],
      },
    ],
  },

  clareira_podre: {
    id: 'clareira_podre',
    name: 'Clareira Podre',
    theme: 'grama',
    width: 15,
    height: 11,
    layout: [
      '###############',
      '#,...........,#',
      '#....,...,....#',
      '#P...........M#',
      '#P..~~...~~..M#',
      '#P...........M#',
      '#P..~~...~~..M#',
      '#....,...,....#',
      '#,...........,#',
      '#.............#',
      '###############',
    ],
    waves: [
      { spawns: [{ monsterId: 'espectro_menor', count: 3 }] },
      {
        spawns: [
          { monsterId: 'lobo_sombrio', count: 2 },
          { monsterId: 'espectro_menor', count: 2 },
        ],
      },
      { spawns: [{ monsterId: 'lobo_sombrio', count: 4 }] },
      {
        spawns: [
          { monsterId: 'javali_sanguinario', count: 2 },
          { monsterId: 'lobo_sombrio', count: 2 },
        ],
      },
      { spawns: [{ monsterId: 'esqueleto_guerreiro', count: 3 }] },
      {
        boss: true,
        spawns: [
          { monsterId: 'senhor_do_covil', count: 1 },
          { monsterId: 'javali_sanguinario', count: 3 },
        ],
      },
    ],
  },
};

export const ARENA_IDS = Object.keys(ARENAS);

export function getArena(id: string): ArenaDef {
  const arena = ARENAS[id];
  if (!arena) throw new Error(`Arena desconhecida: ${id}`);
  return arena;
}
