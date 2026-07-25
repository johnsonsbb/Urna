import {
  TICK_MS,
  createSim,
  getArena,
  gridFor,
  stepSim,
  type Combatant,
  type Doctrine,
  type Fx,
  type LogEntry,
  type PartyConfig,
  type SimState,
  type WaveState,
} from '@covil/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TILE, drawScene } from './renderer';

export interface ArenaSnapshot {
  timeMs: number;
  arenaId: string;
  arenaName: string;
  waveIndex: number;
  totalWaves: number;
  isBoss: boolean;
  waveState: WaveState;
  party: Combatant[];
  monstersAlive: number;
  totals: SimState['totals'];
  log: LogEntry[];
}

export interface UseArenaOptions {
  arenaId: string;
  party: PartyConfig[];
  seed: number;
  speed: number;
  paused: boolean;
}

/** Quantos passos no máximo por quadro, para uma aba lenta não travar tudo. */
const MAX_STEPS_PER_FRAME = 90;
const SNAPSHOT_INTERVAL_MS = 120;
const LOG_LIMIT = 120;

export function useArena(options: UseArenaOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<SimState | null>(null);
  const fxRef = useRef<Fx[]>([]);
  const logRef = useRef<LogEntry[]>([]);
  const accRef = useRef(0);

  const speedRef = useRef(options.speed);
  const pausedRef = useRef(options.paused);
  speedRef.current = options.speed;
  pausedRef.current = options.paused;

  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);

  const { arenaId, party, seed } = options;

  // Recria a simulação quando a arena, o grupo ou a semente mudam.
  useEffect(() => {
    simRef.current = createSim({ arenaId, party, seed });
    fxRef.current = [];
    logRef.current = [];
    accRef.current = 0;
    setSnapshot(buildSnapshot(simRef.current, logRef.current));
  }, [arenaId, party, seed]);

  useEffect(() => {
    let frameId = 0;
    let lastFrame = performance.now();
    let lastPublish = 0;

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);

      const sim = simRef.current;
      const canvas = canvasRef.current;
      if (!sim || !canvas) {
        lastFrame = now;
        return;
      }

      // Aba em segundo plano acumula um delta enorme — descartamos o excesso
      // em vez de simular a diferença. Progresso longe daqui é assunto do
      // catch-up no servidor, não do laço de render.
      const delta = Math.min(250, now - lastFrame);
      lastFrame = now;

      if (!pausedRef.current) {
        accRef.current += delta * speedRef.current;

        let steps = 0;
        while (accRef.current >= TICK_MS && steps < MAX_STEPS_PER_FRAME) {
          const result = stepSim(sim);
          if (result.fx.length > 0) fxRef.current.push(...result.fx);
          if (result.log.length > 0) logRef.current.push(...result.log);
          accRef.current -= TICK_MS;
          steps++;
        }
        if (steps >= MAX_STEPS_PER_FRAME) accRef.current = 0;

        if (logRef.current.length > LOG_LIMIT) {
          logRef.current.splice(0, logRef.current.length - LOG_LIMIT);
        }
        fxRef.current = fxRef.current.filter(
          (effect) => sim.timeMs - effect.tMs < effect.durationMs + 100,
        );
      }

      paint(canvas, sim, fxRef.current, accRef.current / TICK_MS);

      if (now - lastPublish >= SNAPSHOT_INTERVAL_MS) {
        lastPublish = now;
        setSnapshot(buildSnapshot(sim, logRef.current));
      }
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const updateDoctrine = useCallback((memberIndex: number, patch: Partial<Doctrine>) => {
    const sim = simRef.current;
    if (!sim) return;
    const members = sim.combatants.filter((c) => c.side === 'party');
    const member = members[memberIndex];
    if (!member) return;
    member.doctrine = { ...member.doctrine, ...patch };
    setSnapshot(buildSnapshot(sim, logRef.current));
  }, []);

  const restart = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    simRef.current = createSim({ arenaId: sim.arenaId, party, seed: sim.rngSeed });
    fxRef.current = [];
    logRef.current = [];
    accRef.current = 0;
  }, [party]);

  return { canvasRef, snapshot, updateDoctrine, restart };
}

function paint(
  canvas: HTMLCanvasElement,
  sim: SimState,
  fx: readonly Fx[],
  alpha: number,
): void {
  const grid = gridFor(sim.arenaId);
  const arena = getArena(sim.arenaId);

  const worldWidth = grid.width * TILE;
  const worldHeight = grid.height * TILE;

  // O palco define o tamanho; o canvas apenas o preenche. A proporção vem da
  // arena, então trocar de mapa não distorce a cena.
  const stage = canvas.parentElement;
  if (stage) stage.style.aspectRatio = `${grid.width} / ${grid.height}`;

  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const cssWidth = canvas.clientWidth || worldWidth;
  const scale = cssWidth / worldWidth;

  const backingWidth = Math.round(cssWidth * dpr);
  const backingHeight = Math.round(worldHeight * scale * dpr);
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.clearRect(0, 0, worldWidth, worldHeight);
  drawScene(ctx, { state: sim, grid, fx, alpha, theme: arena.theme });
}

function buildSnapshot(sim: SimState, log: LogEntry[]): ArenaSnapshot {
  const arena = getArena(sim.arenaId);
  const wave = arena.waves[sim.waveIndex];

  return {
    timeMs: sim.timeMs,
    arenaId: sim.arenaId,
    arenaName: arena.name,
    waveIndex: sim.waveIndex,
    totalWaves: arena.waves.length,
    isBoss: Boolean(wave?.boss),
    waveState: sim.waveState,
    party: sim.combatants.filter((c) => c.side === 'party').map((c) => ({ ...c })),
    monstersAlive: sim.combatants.filter((c) => c.side === 'monster' && c.alive).length,
    totals: { ...sim.totals },
    log: log.slice(-40),
  };
}
