import {
  attackMaxFor,
  attackMinFor,
  magicLevelFor,
  maxHpFor,
  maxManaFor,
} from '../formulas.js';
import { getMonster } from '../data/monsters.js';
import { getVocation } from '../data/vocations.js';
import type { Combatant, Doctrine, Vec2, Vocation } from '../types.js';

export interface PartyConfig {
  name: string;
  vocation: Vocation;
  level: number;
  /** Sobrescreve pontos da doutrina padrão da vocação. */
  doctrine?: Partial<Doctrine>;
  potions?: number;
  manaPotions?: number;
}

function baseCombatant(id: string, pos: Vec2): Omit<
  Combatant,
  | 'side'
  | 'name'
  | 'level'
  | 'hp'
  | 'maxHp'
  | 'mana'
  | 'maxMana'
  | 'attackMin'
  | 'attackMax'
  | 'armor'
  | 'attackRange'
  | 'attackSpeedMs'
  | 'moveSpeedMs'
  | 'magicLevel'
  | 'doctrine'
  | 'spells'
  | 'sprite'
> {
  return {
    id,
    pos: { ...pos },
    facing: 'sul',
    alive: true,
    corpseMs: 0,
    moveFrom: null,
    moveProgress: 0,
    moveDurationMs: 0,
    attackCdMs: 0,
    potionCdMs: 0,
    spellCdMs: {},
    targetId: null,
    potions: 0,
    manaPotions: 0,
    scale: 1,
    damageDone: 0,
    damageTaken: 0,
    healingDone: 0,
  };
}

export function createPartyMember(config: PartyConfig, id: string, pos: Vec2): Combatant {
  const voc = getVocation(config.vocation);
  const level = Math.max(1, config.level);
  const maxHp = maxHpFor(voc, level);
  const maxMana = maxManaFor(voc, level);

  return {
    ...baseCombatant(id, pos),
    side: 'party',
    name: config.name,
    vocation: config.vocation,
    level,
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    attackMin: attackMinFor(voc, level),
    attackMax: attackMaxFor(voc, level),
    armor: voc.baseArmor + Math.floor(level * 0.4),
    attackRange: voc.attackRange,
    attackSpeedMs: voc.attackSpeedMs,
    moveSpeedMs: voc.moveSpeedMs,
    magicLevel: magicLevelFor(voc, level),
    potions: config.potions ?? 200,
    manaPotions: config.manaPotions ?? 200,
    doctrine: { ...voc.defaultDoctrine, ...config.doctrine },
    spells: voc.spells,
    sprite: voc.sprite,
    facing: 'leste',
  };
}

export function createMonster(monsterId: string, id: string, pos: Vec2): Combatant {
  const def = getMonster(monsterId);

  return {
    ...baseCombatant(id, pos),
    side: 'monster',
    name: def.name,
    monsterId,
    level: 1,
    hp: def.hp,
    maxHp: def.hp,
    mana: 0,
    maxMana: 0,
    attackMin: def.attackMin,
    attackMax: def.attackMax,
    armor: def.armor,
    attackRange: def.attackRange,
    attackSpeedMs: def.attackSpeedMs,
    moveSpeedMs: def.moveSpeedMs,
    magicLevel: 0,
    doctrine: {
      line: 'frente',
      targetPriority: 'mais-proximo',
      engageDistance: def.attackRange,
      potionBelowPct: 0,
      manaPotionBelowPct: 0,
      healAllyBelowPct: 0,
    },
    spells: [],
    sprite: def.sprite,
    scale: def.scale ?? 1,
    facing: 'oeste',
  };
}
