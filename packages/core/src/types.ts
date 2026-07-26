/** Tipos compartilhados entre engine, servidor e cliente. */

export type Vocation = 'knight' | 'paladin' | 'sorcerer' | 'druid';

export type Side = 'party' | 'monster';

export type SkillId = 'melee' | 'distance' | 'magic' | 'shielding';

export type Facing = 'norte' | 'sul' | 'leste' | 'oeste';

export interface Vec2 {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Doutrina — a agência do jogador sobre o combate, definida antes da caçada
// ---------------------------------------------------------------------------

export type BattleLine = 'frente' | 'meio' | 'tras';

export type TargetPriority =
  | 'mais-proximo'
  | 'mais-fraco'
  | 'mais-forte'
  | 'conjurador';

export interface Doctrine {
  /** Onde o personagem tenta se posicionar em relação aos inimigos. */
  line: BattleLine;
  targetPriority: TargetPriority;
  /** Distância que tenta manter do alvo, em tiles. */
  engageDistance: number;
  /** Bebe poção de vida abaixo desta % de vida. */
  potionBelowPct: number;
  /** Bebe poção de mana abaixo desta % de mana. */
  manaPotionBelowPct: number;
  /** O druida cura um aliado abaixo desta % de vida. */
  healAllyBelowPct: number;
}

// ---------------------------------------------------------------------------
// Magias
// ---------------------------------------------------------------------------

/**
 * Matriz de área, no mesmo formato do TFS:
 *   0 = tile não atingido
 *   1 = tile atingido
 *   2 = origem (conjurador ou alvo, conforme `origin`)
 */
export type AreaPattern = readonly (readonly number[])[];

export interface SpellDef {
  id: string;
  name: string;
  /** Palavras mágicas exibidas sobre o personagem ao conjurar. */
  words: string;
  kind: 'dano' | 'cura';
  manaCost: number;
  cooldownMs: number;
  levelReq: number;
  /** Alcance máximo em tiles até o alvo. */
  range: number;
  /** A matriz é centrada no conjurador ou no alvo? */
  origin: 'conjurador' | 'alvo';
  area: AreaPattern;
  /** Dano/cura base, antes do escalonamento por nível e magic level. */
  baseMin: number;
  baseMax: number;
  /** Identificador do efeito visual. */
  effect: string;
  /** Projétil disparado até o alvo, se houver. */
  missile?: string;
}

// ---------------------------------------------------------------------------
// Vocações e monstros
// ---------------------------------------------------------------------------

export interface VocationDef {
  id: Vocation;
  name: string;
  role: 'tank' | 'dano' | 'suporte';
  description: string;
  baseHp: number;
  baseMana: number;
  hpPerLevel: number;
  manaPerLevel: number;
  /** Alcance do ataque básico, em tiles. */
  attackRange: number;
  attackSpeedMs: number;
  /** Tempo para andar um tile. */
  moveSpeedMs: number;
  /** Multiplicadores de dano por fonte. */
  meleeMod: number;
  distanceMod: number;
  spellMod: number;
  baseArmor: number;
  spells: readonly string[];
  defaultDoctrine: Doctrine;
  sprite: string;
}

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  attackMin: number;
  attackMax: number;
  armor: number;
  attackRange: number;
  attackSpeedMs: number;
  moveSpeedMs: number;
  exp: number;
  gold: [number, number];
  sprite: string;
  /** Monstro maior ocupa mais espaço visual (1 = 1 tile). */
  scale?: number;
}

// ---------------------------------------------------------------------------
// Arena
// ---------------------------------------------------------------------------

export type TileKind = 'chao' | 'parede' | 'agua' | 'decoracao';

export interface ArenaDef {
  id: string;
  name: string;
  width: number;
  height: number;
  /**
   * Layout em texto, uma string por linha:
   *   '.' chão   '#' parede   '~' água   ',' decoração (andável)
   *   'P' spawn do grupo      'M' spawn de monstro
   */
  layout: readonly string[];
  /** Paleta de cores do piso, usada pelo renderizador. */
  theme: 'areia' | 'grama' | 'caverna';
  waves: readonly WaveDef[];
}

export interface WaveDef {
  /** Criaturas da onda: id do monstro e quantidade. */
  spawns: readonly { monsterId: string; count: number }[];
  boss?: boolean;
}

// ---------------------------------------------------------------------------
// Combatente
// ---------------------------------------------------------------------------

export interface Combatant {
  id: string;
  side: Side;
  name: string;
  vocation?: Vocation;
  monsterId?: string;
  level: number;

  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;

  pos: Vec2;
  facing: Facing;
  alive: boolean;
  /** ms restantes com o corpo na tela antes de sumir. */
  corpseMs: number;

  /** Tile de origem enquanto anda; `null` quando parado. */
  moveFrom: Vec2 | null;
  /** Progresso da caminhada atual, 0..1. */
  moveProgress: number;
  moveDurationMs: number;

  attackCdMs: number;
  potionCdMs: number;
  spellCdMs: Record<string, number>;

  targetId: string | null;

  attackMin: number;
  attackMax: number;
  armor: number;
  attackRange: number;
  attackSpeedMs: number;
  moveSpeedMs: number;
  magicLevel: number;

  potions: number;
  manaPotions: number;

  doctrine: Doctrine;
  spells: readonly string[];
  sprite: string;
  scale: number;

  damageDone: number;
  damageTaken: number;
  healingDone: number;
}

// ---------------------------------------------------------------------------
// Estado da simulação
// ---------------------------------------------------------------------------

export type WaveState = 'preparando' | 'lutando' | 'limpa' | 'derrota';

export interface SimState {
  /** Tempo simulado desde o início, em ms. */
  timeMs: number;
  arenaId: string;
  waveIndex: number;
  waveState: WaveState;
  /** Contagem regressiva entre ondas. */
  waveTimerMs: number;
  combatants: Combatant[];
  rngSeed: number;
  nextId: number;
  /**
   * Limite exclusivo de avanço. Ao vencer a última onda permitida, o grupo
   * recomeça o covil do início — é assim que o farm seguro funciona: refazer
   * o que já se vence, em vez de repetir só a onda mais difícil.
   */
  waveCap: number;
  /** Quantas vezes o grupo foi derrotado nesta simulação. */
  wipes: number;
  /** Maior número de ondas vencidas em sequência — alimenta o progresso salvo. */
  highestWaveCleared: number;
  totals: {
    kills: number;
    wavesCleared: number;
    exp: number;
    gold: number;
    potionsUsed: number;
  };
}

// ---------------------------------------------------------------------------
// Estado persistente do jogador
// ---------------------------------------------------------------------------

/** Política definida antes de fechar o app. */
export type HuntPolicy = 'seguro' | 'empurrar';

export interface PartyMemberState {
  id: string;
  name: string;
  vocation: Vocation;
  experience: number;
  doctrine: Doctrine;
  potions: number;
  manaPotions: number;
}

/**
 * O que é salvo entre sessões.
 *
 * Não é o `SimState`: a arena é efêmera e recriada a cada catch-up. O que
 * persiste é o perfil — grupo, progresso, recursos e a política escolhida.
 */
export interface PlayerState {
  version: number;
  party: PartyMemberState[];
  gold: number;
  /** Stamina restante, em minutos. */
  stamina: number;
  arenaId: string;
  /** Quantas ondas da arena **atual** já foram vencidas. */
  clearedWaves: number;
  /**
   * Progresso guardado das outras arenas.
   *
   * Trocar de covil não pode apagar o que já foi conquistado: ao trocar, o
   * progresso atual é arquivado aqui e o da arena de destino é restaurado.
   */
  arenaProgress: Record<string, number>;
  policy: HuntPolicy;
  rngSeed: number;
  /** Epoch ms do último catch-up aplicado pelo servidor. */
  lastTickAt: number;
  totals: {
    kills: number;
    deaths: number;
    expEarned: number;
    goldEarned: number;
    wavesCleared: number;
    huntedMs: number;
  };
}

export interface LevelUp {
  name: string;
  from: number;
  to: number;
}

// ---------------------------------------------------------------------------
// Visão enviada ao cliente
// ---------------------------------------------------------------------------

/**
 * O que o servidor expõe do jogador.
 *
 * Vive no core para os dois lados compilarem contra o mesmo contrato — se o
 * servidor mudar o formato, o cliente quebra na compilação e não em produção.
 * Note o que **não** está aqui: a semente do RNG e o estado bruto.
 */
export interface PartyMemberView {
  id: string;
  name: string;
  vocation: Vocation;
  level: number;
  experience: number;
  expToNext: number;
  potions: number;
  manaPotions: number;
  doctrine: Doctrine;
}

export interface PlayerView {
  gold: number;
  stamina: number;
  arenaId: string;
  arenaName: string;
  clearedWaves: number;
  totalWaves: number;
  policy: HuntPolicy;
  level: number;
  totals: PlayerState['totals'];
  lastTickAt: number;
  party: PartyMemberView[];
}

/** O relatório que o jogador recebe ao voltar. */
export interface OfflineReport {
  elapsedMs: number;
  /** Tempo efetivamente simulado, já limitado por teto e stamina. */
  simulatedMs: number;
  /** Descartado por exceder o teto offline. */
  skippedMs: number;
  /** Descartado por falta de stamina. */
  restedMs: number;
  staminaSpent: number;
  staminaRegen: number;
  kills: number;
  exp: number;
  gold: number;
  potionsUsed: number;
  wavesCleared: number;
  wipes: number;
  levelUps: LevelUp[];
  policy: HuntPolicy;
  /** Ondas vencidas na arena antes e depois do período. */
  progressBefore: number;
  progressAfter: number;
  /** Ficou sem suprimento durante o período. */
  ranOutOfSupplies: boolean;
}

// ---------------------------------------------------------------------------
// Efeitos visuais emitidos pela simulação
// ---------------------------------------------------------------------------

export type FxKind =
  | 'dano'
  | 'cura'
  | 'fala'
  | 'efeito'
  | 'projetil'
  | 'morte'
  | 'gold'
  | 'aviso';

export interface Fx {
  id: number;
  kind: FxKind;
  /** Momento da simulação em que nasceu, em ms. */
  tMs: number;
  durationMs: number;
  pos: Vec2;
  /** Destino, para projéteis. */
  to?: Vec2;
  text?: string;
  value?: number;
  effect?: string;
  side?: Side;
  /** Combatente envolvido — o renderizador usa para piscar quem apanhou. */
  entityId?: string;
}

export interface LogEntry {
  tMs: number;
  text: string;
  kind: 'combate' | 'onda' | 'morte' | 'loot' | 'aviso';
}

export interface TickResult {
  fx: Fx[];
  log: LogEntry[];
}
