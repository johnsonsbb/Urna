import type { SpellDef } from '../types.js';

/**
 * Magias.
 *
 * As matrizes de área seguem o formato do TFS: 0 não atinge, 1 atinge,
 * 2 marca a origem. Quando `origin` é 'conjurador', a matriz é rotacionada
 * conforme a direção que o personagem está encarando.
 */

export const SPELLS: Record<string, SpellDef> = {
  // --- Knight -------------------------------------------------------------
  golpe_giratorio: {
    id: 'golpe_giratorio',
    name: 'Golpe Giratório',
    words: 'exori',
    kind: 'dano',
    manaCost: 20,
    cooldownMs: 6000,
    levelReq: 1,
    range: 1,
    origin: 'conjurador',
    area: [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1],
    ],
    baseMin: 12,
    baseMax: 24,
    effect: 'impacto',
  },

  brado: {
    id: 'brado',
    name: 'Brado de Guerra',
    words: 'exeta res',
    kind: 'dano',
    manaCost: 30,
    cooldownMs: 14000,
    levelReq: 8,
    range: 1,
    origin: 'conjurador',
    area: [
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 2, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
    ],
    baseMin: 8,
    baseMax: 16,
    effect: 'brado',
  },

  // --- Paladin ------------------------------------------------------------
  flecha_certeira: {
    id: 'flecha_certeira',
    name: 'Flecha Certeira',
    words: 'exori san',
    kind: 'dano',
    manaCost: 25,
    cooldownMs: 4000,
    levelReq: 1,
    range: 5,
    origin: 'alvo',
    area: [[2]],
    baseMin: 20,
    baseMax: 38,
    effect: 'perfuracao',
    missile: 'flecha',
  },

  // --- Sorcerer -----------------------------------------------------------
  bola_de_fogo: {
    id: 'bola_de_fogo',
    name: 'Bola de Fogo',
    words: 'adevo grav flam',
    kind: 'dano',
    manaCost: 30,
    cooldownMs: 3500,
    levelReq: 1,
    range: 5,
    origin: 'alvo',
    area: [
      [0, 1, 0],
      [1, 2, 1],
      [0, 1, 0],
    ],
    baseMin: 18,
    baseMax: 34,
    effect: 'fogo',
    missile: 'chama',
  },

  onda_gelida: {
    id: 'onda_gelida',
    name: 'Onda Gélida',
    words: 'exevo frigo hur',
    kind: 'dano',
    manaCost: 45,
    cooldownMs: 9000,
    levelReq: 12,
    range: 1,
    origin: 'conjurador',
    // Cone apontando para leste; rotacionado conforme a direção do conjurador.
    area: [
      [0, 0, 1],
      [0, 1, 1],
      [2, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    baseMin: 14,
    baseMax: 26,
    effect: 'gelo',
  },

  // --- Druid --------------------------------------------------------------
  cura_leve: {
    id: 'cura_leve',
    name: 'Cura',
    words: 'exura',
    kind: 'cura',
    manaCost: 25,
    cooldownMs: 2500,
    levelReq: 1,
    range: 6,
    origin: 'alvo',
    area: [[2]],
    baseMin: 30,
    baseMax: 50,
    effect: 'cura',
  },

  cura_em_grupo: {
    id: 'cura_em_grupo',
    name: 'Cura em Grupo',
    words: 'exura sio',
    kind: 'cura',
    manaCost: 60,
    cooldownMs: 12000,
    levelReq: 10,
    range: 6,
    origin: 'alvo',
    area: [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1],
    ],
    baseMin: 24,
    baseMax: 40,
    effect: 'cura',
  },

  espinhos: {
    id: 'espinhos',
    name: 'Espinhos',
    words: 'adori mas vita',
    kind: 'dano',
    manaCost: 35,
    cooldownMs: 7000,
    levelReq: 6,
    range: 5,
    origin: 'alvo',
    area: [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1],
    ],
    baseMin: 12,
    baseMax: 24,
    effect: 'natureza',
  },
};

export function getSpell(id: string): SpellDef {
  const spell = SPELLS[id];
  if (!spell) throw new Error(`Magia desconhecida: ${id}`);
  return spell;
}
