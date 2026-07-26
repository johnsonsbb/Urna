/**
 * Fórmulas do jogo.
 *
 * A curva de experiência é a mesma do TFS, mantida por familiaridade com o
 * gênero. As demais são nossas e existem para serem ajustadas no
 * balanceamento — nenhum número aqui é sagrado.
 */

import type { Vec2, VocationDef } from './types.js';

/** Experiência total acumulada necessária para atingir um nível. */
export function totalExpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  return Math.floor((50 * n * n * n - 150 * n * n + 400 * n) / 3);
}

/** Experiência que falta do nível atual para o próximo. */
export function expToNextLevel(level: number, experience: number): number {
  return Math.max(0, totalExpForLevel(level + 1) - experience);
}

/** Inverso de `totalExpForLevel`: o nível correspondente a uma experiência. */
export function levelFromExp(experience: number): number {
  if (experience <= 0) return 1;

  // Busca binária sobre uma curva monotônica. O teto é folgado de propósito:
  // nenhuma progressão realista chega perto dele.
  let low = 1;
  let high = 2000;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (totalExpForLevel(middle) <= experience) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** Progresso dentro do nível atual, 0..1. */
export function levelProgress(level: number, experience: number): number {
  const floor = totalExpForLevel(level);
  const ceil = totalExpForLevel(level + 1);
  if (ceil <= floor) return 0;
  return Math.min(1, Math.max(0, (experience - floor) / (ceil - floor)));
}

export function maxHpFor(voc: VocationDef, level: number): number {
  return Math.floor(voc.baseHp + (level - 1) * voc.hpPerLevel);
}

export function maxManaFor(voc: VocationDef, level: number): number {
  return Math.floor(voc.baseMana + (level - 1) * voc.manaPerLevel);
}

/** Magic level aproximado a partir do nível — placeholder até existir treino por uso. */
export function magicLevelFor(voc: VocationDef, level: number): number {
  return Math.floor(level * voc.spellMod * 0.55);
}

/**
 * Dano máximo do ataque básico.
 *
 * Serve de proxy para "arma + skill" enquanto equipamento não existe: o nível
 * faz o papel dos dois, escalado pelo multiplicador da vocação.
 */
export function attackMaxFor(voc: VocationDef, level: number): number {
  const mod = voc.attackRange > 1 ? voc.distanceMod : voc.meleeMod;
  return Math.max(1, Math.floor((10 + level * 2.4) * mod));
}

export function attackMinFor(voc: VocationDef, level: number): number {
  return Math.max(1, Math.floor(attackMaxFor(voc, level) * 0.35));
}

/** Escalonamento de dano/cura de magia por nível e magic level. */
export function spellScale(level: number, magicLevel: number): number {
  return 1 + level * 0.02 + magicLevel * 0.15;
}

/**
 * Dano final depois da armadura.
 *
 * A armadura absorve entre metade e o total do seu valor, e o dano nunca
 * chega a zero — apanhar sempre custa alguma coisa.
 */
export function applyArmor(raw: number, armor: number, absorbRoll: number): number {
  const absorbed = Math.floor(armor / 2 + (armor / 2) * absorbRoll);
  return Math.max(1, raw - absorbed);
}

/** Distância de Chebyshev — em grid com diagonais, é a contagem de passos. */
export function tileDistance(a: Vec2, b: Vec2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function samePos(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Formata números grandes como no gênero: 12.4k, 3.2M. */
export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return Math.floor(value).toLocaleString('pt-BR');
}

/** Formata duração em ms como 6h14 / 12min / 45s. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}`;
  if (minutes > 0) return `${minutes}min`;
  return `${seconds}s`;
}
