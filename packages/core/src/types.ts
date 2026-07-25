/** Tipos compartilhados entre engine, servidor e cliente. */

export type Vocation = 'knight' | 'paladin' | 'druid' | 'sorcerer';

export type SkillId = 'melee' | 'distance' | 'magic' | 'shielding';

export type EquipSlot =
  | 'helmet'
  | 'amulet'
  | 'weapon'
  | 'shield'
  | 'armor'
  | 'ring'
  | 'legs'
  | 'boots';

export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export type ItemKind = EquipSlot | 'potion' | 'loot';

export interface HealEffect {
  hp?: number;
  mana?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  /** Slot de equipamento; ausente em poções e itens de loot. */
  slot?: EquipSlot;
  attack?: number;
  /** Defesa da arma/escudo — alimenta a chance de bloqueio. */
  defense?: number;
  /** Redução de dano físico. */
  armor?: number;
  /** Bônus de magic level concedido pelo item. */
  magicBonus?: number;
  /** Intervalo entre golpes da arma. Sem arma, usa o padrão de punho. */
  attackSpeedMs?: number;
  /** Arma de longo alcance: usa a skill `distance`. */
  ranged?: boolean;
  twoHanded?: boolean;
  heal?: HealEffect;
  /** Peso unitário em oz. */
  weight: number;
  /** Quanto o NPC paga por unidade. */
  value: number;
  /** Preço de compra no NPC. Ausente = não vendido em loja. */
  shopPrice?: number;
  stackable?: boolean;
  levelReq?: number;
  /** Restrição de vocação. Ausente = livre para todas. */
  vocations?: readonly Vocation[];
  description?: string;
}

export interface LootEntry {
  itemId: string;
  /** Probabilidade por abate, 0..1. */
  chance: number;
  min?: number;
  max?: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  /** Dano máximo por golpe antes da armadura. */
  attack: number;
  /** Armadura da criatura, reduz o dano recebido. */
  armor: number;
  attackSpeedMs: number;
  exp: number;
  loot: readonly LootEntry[];
}

export interface AreaDef {
  id: string;
  name: string;
  description: string;
  levelReq: number;
  /** Pool de criaturas com pesos relativos de spawn. */
  monsters: readonly { monsterId: string; weight: number }[];
  /** Tempo entre um abate e o próximo spawn. */
  respawnMs: number;
}

export interface VocationDef {
  id: Vocation;
  name: string;
  description: string;
  baseHp: number;
  baseMana: number;
  baseCapacity: number;
  hpPerLevel: number;
  manaPerLevel: number;
  capacityPerLevel: number;
  /** Multiplicadores de dano por fonte. */
  meleeMod: number;
  distanceMod: number;
  spellMod: number;
  /** Quanto mais alto, mais lento o avanço da skill. */
  skillFactors: Record<SkillId, number>;
  /** Regeneração base, em pontos por segundo. */
  hpRegen: number;
  manaRegen: number;
  /** Magia de ataque desbloqueada pela vocação. */
  spell: SpellDef | null;
  /** Equipamento inicial (ids de item). */
  startingEquipment: readonly string[];
}

export interface SpellDef {
  id: string;
  name: string;
  manaCost: number;
  cooldownMs: number;
  levelReq: number;
}

export interface ItemStack {
  itemId: string;
  qty: number;
}

export interface CharacterSkills {
  melee: number;
  distance: number;
  magic: number;
  shielding: number;
}

export interface CharacterSettings {
  /** Bebe poção de vida quando a vida cai abaixo desta porcentagem (0..100). */
  autoPotionHpPct: number;
  /** Recolhe apenas loot desta raridade ou superior. */
  autoLootMinRarity: Rarity;
  /** Usa a magia de ataque da vocação quando houver mana. */
  useSpells: boolean;
}

export interface CombatState {
  /** Criatura em combate, ou `null` durante respawn/descanso. */
  monsterId: string | null;
  monsterHp: number;
  monsterMaxHp: number;
  /** Cooldowns restantes em ms. */
  playerCdMs: number;
  monsterCdMs: number;
  spellCdMs: number;
  respawnMs: number;
  /** Personagem recuando para a cidade para se curar. */
  resting: boolean;
  restMs: number;
}

export interface CharacterTotals {
  kills: number;
  deaths: number;
  expEarned: number;
  goldEarned: number;
  /** Tempo total caçando, em ms. */
  huntedMs: number;
}

/** Estado completo e serializável de um personagem. É o formato do save. */
export interface CharacterState {
  version: number;
  name: string;
  vocation: Vocation;
  level: number;
  experience: number;
  skills: CharacterSkills;
  /** Tentativas acumuladas em direção ao próximo ponto de cada skill. */
  skillTries: CharacterSkills;
  hp: number;
  mana: number;
  gold: number;
  /** Stamina restante em minutos. Gate anti-farm infinito. */
  stamina: number;
  areaId: string;
  inventory: ItemStack[];
  equipment: Partial<Record<EquipSlot, string>>;
  settings: CharacterSettings;
  combat: CombatState;
  totals: CharacterTotals;
  rngSeed: number;
  /** Epoch ms do último tick aplicado. O servidor usa isto para o catch-up. */
  lastTickAt: number;
}

/** Atributos efetivos, derivados de vocação + nível + equipamento. */
export interface DerivedStats {
  maxHp: number;
  maxMana: number;
  capacity: number;
  /** Peso carregado, em oz. */
  load: number;
  attack: number;
  armor: number;
  defense: number;
  attackSpeedMs: number;
  ranged: boolean;
  magicLevel: number;
  blockChance: number;
  minHit: number;
  maxHit: number;
  hpRegen: number;
  manaRegen: number;
  spell: (SpellDef & { minHit: number; maxHit: number }) | null;
}

export type SimEventKind =
  | 'hit'
  | 'spell'
  | 'taken'
  | 'block'
  | 'kill'
  | 'loot'
  | 'levelup'
  | 'skillup'
  | 'death'
  | 'potion'
  | 'rest'
  | 'info';

export interface SimEvent {
  /** Epoch ms em que o evento ocorreu na simulação. */
  t: number;
  kind: SimEventKind;
  text: string;
  value?: number;
  rarity?: Rarity;
}

export interface SimSummary {
  /** Tempo efetivamente simulado (já limitado pelo teto offline). */
  ms: number;
  /** Tempo descartado por exceder o teto offline. */
  skippedMs: number;
  kills: number;
  exp: number;
  gold: number;
  loot: Record<string, number>;
  levelsGained: number;
  deaths: number;
  potionsUsed: number;
  staminaSpent: number;
}

export interface SimResult {
  state: CharacterState;
  events: SimEvent[];
  summary: SimSummary;
}
