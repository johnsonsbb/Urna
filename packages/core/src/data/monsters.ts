import type { MonsterDef } from '../types.js';

/**
 * Criaturas.
 *
 * Nomes próprios de propósito: curvas de stats podem vir de distros do
 * ecossistema OT, mas nomes de criaturas são marca registrada e portanto não
 * são reaproveitados.
 *
 * O campo `sprite` referencia o atlas montado por `scripts/build-atlas.mjs` a
 * partir do OpenTibia Sprite Pack (CC BY 4.0).
 */

export const MONSTERS: Record<string, MonsterDef> = {
  gato_selvagem: {
    id: 'gato_selvagem',
    name: 'Gato Selvagem',
    hp: 42,
    attackMin: 3,
    attackMax: 11,
    armor: 1,
    attackRange: 1,
    attackSpeedMs: 1800,
    moveSpeedMs: 380,
    exp: 12,
    gold: [0, 8],
    sprite: 'gato',
  },

  goblin_saqueador: {
    id: 'goblin_saqueador',
    name: 'Goblin Saqueador',
    hp: 68,
    attackMin: 6,
    attackMax: 18,
    armor: 3,
    attackRange: 1,
    attackSpeedMs: 1600,
    moveSpeedMs: 440,
    exp: 26,
    gold: [4, 20],
    sprite: 'goblin',
  },

  espectro_menor: {
    id: 'espectro_menor',
    name: 'Espectro Menor',
    hp: 95,
    attackMin: 9,
    attackMax: 24,
    armor: 5,
    attackRange: 1,
    attackSpeedMs: 2000,
    moveSpeedMs: 520,
    exp: 44,
    gold: [10, 35],
    sprite: 'espectro',
  },

  lobo_sombrio: {
    id: 'lobo_sombrio',
    name: 'Lobo Sombrio',
    hp: 120,
    attackMin: 12,
    attackMax: 30,
    armor: 4,
    attackRange: 1,
    attackSpeedMs: 1500,
    moveSpeedMs: 320,
    exp: 62,
    gold: [0, 15],
    sprite: 'lobo',
  },

  javali_sanguinario: {
    id: 'javali_sanguinario',
    name: 'Javali Sanguinário',
    hp: 210,
    attackMin: 18,
    attackMax: 44,
    armor: 10,
    attackRange: 1,
    attackSpeedMs: 2200,
    moveSpeedMs: 460,
    exp: 110,
    gold: [25, 70],
    sprite: 'javali',
  },

  esqueleto_guerreiro: {
    id: 'esqueleto_guerreiro',
    name: 'Esqueleto Guerreiro',
    hp: 280,
    attackMin: 22,
    attackMax: 52,
    armor: 8,
    attackRange: 1,
    attackSpeedMs: 2000,
    moveSpeedMs: 560,
    exp: 165,
    gold: [30, 95],
    sprite: 'esqueleto',
  },

  senhor_do_covil: {
    id: 'senhor_do_covil',
    name: 'Senhor do Covil',
    hp: 1400,
    attackMin: 40,
    attackMax: 95,
    armor: 18,
    attackRange: 1,
    attackSpeedMs: 1900,
    moveSpeedMs: 500,
    exp: 1200,
    gold: [400, 900],
    sprite: 'diabrete',
    scale: 1.7,
  },
};

export function getMonster(id: string): MonsterDef {
  const monster = MONSTERS[id];
  if (!monster) throw new Error(`Criatura desconhecida: ${id}`);
  return monster;
}
