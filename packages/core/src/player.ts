/** Estado persistente do jogador: criação, derivações e ganho de experiência. */

import { getVocation } from './data/vocations.js';
import { levelFromExp, totalExpForLevel } from './formulas.js';
import { randomSeed } from './rng.js';
import type { PartyConfig } from './sim/spawn.js';
import type { LevelUp, PartyMemberState, PlayerState, Vocation } from './types.js';

export const PLAYER_STATE_VERSION = 1;

/** Três slots para quatro vocações — compor o grupo é uma decisão real. */
export const MAX_PARTY_SLOTS = 3;

export const STARTING_GOLD = 500;
export const STARTING_POTIONS = 120;

/** Stamina máxima, em minutos. */
export const STAMINA_MAX = 42 * 60;
/** Abaixo disto a experiência cai pela metade. */
export const STAMINA_LOW = 14 * 60;

export interface CreatePlayerOptions {
  party: { name: string; vocation: Vocation }[];
  arenaId?: string;
  seed?: number;
  now?: number;
}

export function createPlayer(options: CreatePlayerOptions): PlayerState {
  const now = options.now ?? Date.now();

  const party: PartyMemberState[] = options.party
    .slice(0, MAX_PARTY_SLOTS)
    .map((member, index) => ({
      id: `m${index + 1}`,
      name: member.name,
      vocation: member.vocation,
      experience: 0,
      doctrine: { ...getVocation(member.vocation).defaultDoctrine },
      potions: STARTING_POTIONS,
      manaPotions: STARTING_POTIONS,
    }));

  return {
    version: PLAYER_STATE_VERSION,
    party,
    gold: STARTING_GOLD,
    stamina: STAMINA_MAX,
    arenaId: options.arenaId ?? 'covil_raso',
    clearedWaves: 0,
    arenaProgress: {},
    policy: 'empurrar',
    rngSeed: options.seed ?? randomSeed(),
    lastTickAt: now,
    totals: {
      kills: 0,
      deaths: 0,
      expEarned: 0,
      goldEarned: 0,
      wavesCleared: 0,
      huntedMs: 0,
    },
  };
}

export function memberLevel(member: PartyMemberState): number {
  return levelFromExp(member.experience);
}

/** Converte o estado persistido na configuração que a simulação consome. */
export function toPartyConfigs(player: PlayerState): PartyConfig[] {
  return player.party.map((member) => ({
    name: member.name,
    vocation: member.vocation,
    level: memberLevel(member),
    doctrine: member.doctrine,
    potions: member.potions,
    manaPotions: member.manaPotions,
  }));
}

/**
 * Distribui experiência pelo grupo e devolve quem subiu de nível.
 *
 * A divisão é igual entre os membros — dividir por dano ou por presença
 * puniria o suporte, que é justamente quem mantém o grupo vivo.
 */
export function grantExp(player: PlayerState, amount: number): LevelUp[] {
  if (amount <= 0 || player.party.length === 0) return [];

  const share = Math.floor(amount / player.party.length);
  if (share <= 0) return [];

  const levelUps: LevelUp[] = [];
  for (const member of player.party) {
    const before = memberLevel(member);
    member.experience += share;
    const after = memberLevel(member);
    if (after > before) levelUps.push({ name: member.name, from: before, to: after });
  }

  player.totals.expEarned += share * player.party.length;
  return levelUps;
}

/** Experiência que falta para o próximo nível de um membro. */
export function expToNext(member: PartyMemberState): number {
  return Math.max(0, totalExpForLevel(memberLevel(member) + 1) - member.experience);
}

/**
 * Troca a arena preservando o progresso das duas.
 *
 * Sem isto, voltar a um covil já limpo obrigaria a refazê-lo do zero.
 */
export function switchArena(player: PlayerState, arenaId: string): void {
  if (arenaId === player.arenaId) return;
  player.arenaProgress[player.arenaId] = player.clearedWaves;
  player.arenaId = arenaId;
  player.clearedWaves = player.arenaProgress[arenaId] ?? 0;
}

/** Nível médio do grupo — usado no ranking. */
export function partyLevel(player: PlayerState): number {
  if (player.party.length === 0) return 1;
  const total = player.party.reduce((sum, member) => sum + memberLevel(member), 0);
  return Math.floor(total / player.party.length);
}
