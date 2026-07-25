import type { Vocation, VocationDef } from '../types.js';

/**
 * As quatro vocações.
 *
 * São 4 vocações para 3 slots: compor o grupo é uma decisão real desde o
 * primeiro dia, e cada corte tem um preço concreto (ver §6.3 do design).
 */

export const VOCATIONS: Record<Vocation, VocationDef> = {
  knight: {
    id: 'knight',
    name: 'Cavaleiro',
    role: 'tank',
    description:
      'Segura a linha de frente. Muita vida e armadura, dano corpo a corpo constante. Sem ele, o grupo inteiro apanha.',
    baseHp: 185,
    baseMana: 40,
    hpPerLevel: 15,
    manaPerLevel: 5,
    attackRange: 1,
    attackSpeedMs: 2000,
    moveSpeedMs: 500,
    meleeMod: 1.0,
    distanceMod: 0.6,
    spellMod: 0.4,
    baseArmor: 12,
    // A ordem é prioridade: a área forte primeiro, a barata como sustentação.
    spells: ['brado', 'golpe_giratorio'],
    defaultDoctrine: {
      line: 'frente',
      targetPriority: 'mais-proximo',
      engageDistance: 1,
      potionBelowPct: 55,
      manaPotionBelowPct: 20,
      healAllyBelowPct: 0,
    },
    sprite: 'knight',
  },

  paladin: {
    id: 'paladin',
    name: 'Paladino',
    role: 'dano',
    description:
      'Dano constante à distância. Mantém o alvo longe e castiga sem parar. Sem ele, ondas longas viram desgaste.',
    baseHp: 150,
    baseMana: 90,
    hpPerLevel: 10,
    manaPerLevel: 15,
    attackRange: 5,
    attackSpeedMs: 1600,
    moveSpeedMs: 480,
    meleeMod: 0.7,
    distanceMod: 1.0,
    spellMod: 0.7,
    baseArmor: 8,
    spells: ['flecha_certeira'],
    defaultDoctrine: {
      line: 'meio',
      targetPriority: 'mais-fraco',
      engageDistance: 4,
      potionBelowPct: 50,
      manaPotionBelowPct: 30,
      healAllyBelowPct: 0,
    },
    sprite: 'paladin',
  },

  sorcerer: {
    id: 'sorcerer',
    name: 'Feiticeiro',
    role: 'dano',
    description:
      'Dano em área devastador e corpo frágil. Sem ele, o grupo sofre contra ondas numerosas.',
    baseHp: 120,
    baseMana: 160,
    hpPerLevel: 5,
    manaPerLevel: 30,
    attackRange: 4,
    attackSpeedMs: 2200,
    moveSpeedMs: 520,
    meleeMod: 0.4,
    distanceMod: 0.6,
    spellMod: 1.0,
    baseArmor: 5,
    spells: ['onda_gelida', 'bola_de_fogo'],
    defaultDoctrine: {
      line: 'tras',
      targetPriority: 'mais-forte',
      engageDistance: 4,
      potionBelowPct: 60,
      manaPotionBelowPct: 35,
      healAllyBelowPct: 0,
    },
    sprite: 'sorcerer',
  },

  druid: {
    id: 'druid',
    name: 'Druida',
    role: 'suporte',
    description:
      'Mantém o grupo vivo. Cura, controle e alguma área. Sem ele, tudo depende de poção — e isso dói no gold.',
    baseHp: 130,
    baseMana: 150,
    hpPerLevel: 5,
    manaPerLevel: 28,
    attackRange: 4,
    attackSpeedMs: 2200,
    moveSpeedMs: 520,
    meleeMod: 0.4,
    distanceMod: 0.6,
    spellMod: 0.95,
    baseArmor: 6,
    spells: ['cura_leve', 'cura_em_grupo', 'espinhos'],
    defaultDoctrine: {
      line: 'tras',
      targetPriority: 'mais-fraco',
      engageDistance: 5,
      potionBelowPct: 60,
      manaPotionBelowPct: 40,
      healAllyBelowPct: 65,
    },
    sprite: 'druid',
  },
};

export const VOCATION_IDS = Object.keys(VOCATIONS) as Vocation[];

export function getVocation(id: Vocation): VocationDef {
  const voc = VOCATIONS[id];
  if (!voc) throw new Error(`Vocação desconhecida: ${id}`);
  return voc;
}
