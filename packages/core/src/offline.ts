/**
 * Catch-up offline — o coração do jogo.
 *
 * O servidor não gasta CPU com jogador ausente: quando ele volta, o progresso
 * é reconstruído aqui, de uma vez, a partir do último instante salvo e do
 * relógio do servidor. É isso que permite fechar o app e continuar avançando,
 * e é também o que faz o custo do projeto ser por login em vez de por hora
 * de jogo.
 *
 * A mesma função roda no cliente para prever o relatório, mas quem manda é o
 * servidor: o cliente nunca informa quanto ganhou.
 */

import { getArena } from './data/arenas.js';
import { STAMINA_LOW, STAMINA_MAX, grantExp, toPartyConfigs } from './player.js';
import { MAX_PUSH_ATTEMPTS, TICK_MS, createSim, runSim } from './sim/tick.js';
import type { LevelUp, OfflineReport, PlayerState } from './types.js';

/** Teto do progresso offline. Além disto, o tempo é descartado. */
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;

/**
 * Tamanho da fatia de simulação dentro do catch-up.
 *
 * Sem fatiar, o grupo passaria a noite inteira lutando com o nível que tinha
 * ao dormir e só subiria tudo de uma vez no fim — 8 horas de combate no nível
 * 1 para acordar no 14. Fatiando, ele sobe de nível ao longo do período e
 * fica mais forte enquanto luta, que é o que de fato aconteceria.
 */
export const CHUNK_MS = 30 * 60 * 1000;

/** Stamina recuperada por minuto de descanso. */
export const STAMINA_REGEN_RATIO = 1 / 3;

/** Multiplicador de experiência com a stamina baixa. */
export const LOW_STAMINA_EXP_FACTOR = 0.5;

/**
 * Junta os degraus em um salto por personagem.
 *
 * Cada fatia de 30 min gera seus próprios level-ups, então uma noite rende
 * dezenas de entradas — e a tela de retorno vira um paredão de texto. O que
 * interessa é de onde para onde cada um foi.
 */
function collapseLevelUps(levelUps: LevelUp[]): LevelUp[] {
  const porNome = new Map<string, LevelUp>();

  for (const levelUp of levelUps) {
    const atual = porNome.get(levelUp.name);
    if (!atual) {
      porNome.set(levelUp.name, { ...levelUp });
      continue;
    }
    atual.from = Math.min(atual.from, levelUp.from);
    atual.to = Math.max(atual.to, levelUp.to);
  }

  return [...porNome.values()];
}

function emptyReport(player: PlayerState, elapsedMs: number): OfflineReport {
  return {
    elapsedMs,
    simulatedMs: 0,
    skippedMs: 0,
    restedMs: 0,
    staminaSpent: 0,
    staminaRegen: 0,
    kills: 0,
    exp: 0,
    gold: 0,
    potionsUsed: 0,
    wavesCleared: 0,
    wipes: 0,
    levelUps: [],
    policy: player.policy,
    progressBefore: player.clearedWaves,
    progressAfter: player.clearedWaves,
    ranOutOfSupplies: false,
  };
}

/**
 * Aplica o tempo decorrido ao estado do jogador.
 *
 * Muta `player` e devolve o relatório que a tela de retorno exibe.
 */
export function runOffline(player: PlayerState, now: number): OfflineReport {
  const elapsedMs = Math.max(0, now - player.lastTickAt);
  if (elapsedMs < TICK_MS || player.party.length === 0) {
    player.lastTickAt = now;
    return emptyReport(player, elapsedMs);
  }

  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  const skippedMs = elapsedMs - cappedMs;

  // A stamina limita o tempo produtivo; o resto vira descanso.
  const staminaMs = player.stamina * 60_000;
  const simulatedMs = Math.min(cappedMs, staminaMs);
  const restedMs = cappedMs - simulatedMs;

  const arena = getArena(player.arenaId);
  const totalWaves = arena.waves.length;
  const progressBefore = player.clearedWaves;
  const staminaBefore = player.stamina;

  const levelUps: LevelUp[] = [];
  let kills = 0;
  let exp = 0;
  let gold = 0;
  let potionsUsed = 0;
  let wavesCleared = 0;
  let wipes = 0;
  let ranOutOfSupplies = false;

  // Fatiar mantém a progressão honesta: o grupo sobe de nível durante o
  // período e luta as horas seguintes já mais forte.
  let remainingMs = simulatedMs;
  let staminaLeft = player.stamina;

  // O limite de tentativas precisa atravessar as fatias. Se ficasse dentro de
  // cada uma, o contador zeraria a cada 30 minutos e o grupo passaria a noite
  // inteira se jogando contra a mesma parede.
  let failedPushes = 0;
  let gaveUp = false;

  while (remainingMs >= TICK_MS) {
    const sliceMs = Math.min(CHUNK_MS, remainingMs);
    remainingMs -= sliceMs;

    const pushing =
      player.policy === 'empurrar' && player.clearedWaves < totalWaves && !gaveUp;
    const clearedAtSliceStart = player.clearedWaves;

    const sim = createSim({
      arenaId: player.arenaId,
      party: toPartyConfigs(player),
      seed: player.rngSeed,
      // O ciclo sempre recomeça do início do covil. Empurrar libera apenas uma
      // onda além do que já foi vencido — a fronteira, e nada mais.
      waveIndex: 0,
      waveCap: pushing ? player.clearedWaves + 1 : Math.max(1, player.clearedWaves),
    });

    // `collect: false` descarta efeitos e log — ninguém vai assistir aos
    // centenas de milhares de eventos de uma noite inteira.
    runSim(sim, sliceMs, false);

    // Experiência com o desconto de stamina baixa, apurado por fatia.
    const sliceMinutes = sliceMs / 60_000;
    const fullMinutes = Math.max(0, Math.min(sliceMinutes, staminaLeft - STAMINA_LOW));
    const reducedMinutes = sliceMinutes - fullMinutes;
    const expFactor =
      sliceMinutes > 0
        ? (fullMinutes + reducedMinutes * LOW_STAMINA_EXP_FACTOR) / sliceMinutes
        : 1;
    staminaLeft = Math.max(0, staminaLeft - sliceMinutes);

    const sliceExp = Math.floor(sim.totals.exp * expFactor);
    levelUps.push(...grantExp(player, sliceExp));

    exp += sliceExp;
    kills += sim.totals.kills;
    gold += sim.totals.gold;
    potionsUsed += sim.totals.potionsUsed;
    wavesCleared += sim.totals.wavesCleared;
    wipes += sim.wipes;

    // O estoque restante vem da simulação: o consumo real por membro é o que
    // importa, não uma média.
    const survivors = sim.combatants.filter((c) => c.side === 'party');
    player.party.forEach((member, index) => {
      const combatant = survivors[index];
      if (!combatant) return;
      member.potions = Math.max(0, combatant.potions);
      member.manaPotions = Math.max(0, combatant.manaPotions);
      if (member.potions === 0) ranOutOfSupplies = true;
    });

    if (pushing) {
      player.clearedWaves = Math.max(
        player.clearedWaves,
        Math.min(totalWaves, sim.highestWaveCleared),
      );

      // Progrediu: a parede cedeu, então vale continuar tentando. Não
      // progrediu: as derrotas contam para a desistência.
      if (player.clearedWaves > clearedAtSliceStart) {
        failedPushes = 0;
      } else {
        failedPushes += sim.wipes;
        if (failedPushes >= MAX_PUSH_ATTEMPTS) gaveUp = true;
      }
    }

    player.rngSeed = sim.rngSeed;
  }

  // --- recursos ------------------------------------------------------------
  player.gold += gold;
  player.totals.goldEarned += gold;
  player.totals.kills += kills;
  player.totals.deaths += wipes;
  player.totals.wavesCleared += wavesCleared;
  player.totals.huntedMs += simulatedMs;

  // --- stamina -------------------------------------------------------------
  const staminaSpent = Math.min(staminaBefore, simulatedMs / 60_000);
  const staminaRegen = Math.min(
    STAMINA_MAX - (staminaBefore - staminaSpent),
    (restedMs / 60_000) * STAMINA_REGEN_RATIO,
  );
  player.stamina = Math.max(0, Math.min(STAMINA_MAX, staminaBefore - staminaSpent + staminaRegen));

  player.lastTickAt = now;

  return {
    levelUps: collapseLevelUps(levelUps),
    elapsedMs,
    simulatedMs,
    skippedMs,
    restedMs,
    staminaSpent,
    staminaRegen,
    kills,
    exp,
    gold,
    potionsUsed,
    wavesCleared,
    wipes,
    policy: player.policy,
    progressBefore,
    progressAfter: player.clearedWaves,
    ranOutOfSupplies,
  };
}
