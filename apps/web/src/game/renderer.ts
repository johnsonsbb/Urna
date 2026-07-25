import { TICK_MS, terrainAt, type Combatant, type Fx, type Grid, type SimState } from '@covil/core';

import { getSprite, getSpriteFlash } from './sprites';

/** Lado do tile em pixels lógicos. Toda a cena é desenhada nessa unidade. */
export const TILE = 32;

const HIT_FLASH_MS = 160;
const CORPSE_MS = 5000;

interface Theme {
  floorA: string;
  floorB: string;
  grid: string;
  wall: string;
  wallTop: string;
  water: string;
  waterGlow: string;
  decor: string;
}

const THEMES: Record<string, Theme> = {
  caverna: {
    floorA: '#4a4038',
    floorB: '#443b33',
    grid: '#3b332c',
    wall: '#211b18',
    wallTop: '#2e2621',
    water: '#274a63',
    waterGlow: '#3f7ea3',
    decor: '#5b5044',
  },
  areia: {
    floorA: '#c4b183',
    floorB: '#bda87a',
    grid: '#ae9b6f',
    wall: '#6b5b40',
    wallTop: '#83704f',
    water: '#2f6a8f',
    waterGlow: '#57a8cf',
    decor: '#a89264',
  },
  grama: {
    floorA: '#4a7038',
    floorB: '#446833',
    grid: '#3b5c2c',
    wall: '#2a3d22',
    wallTop: '#38512d',
    water: '#2b5f77',
    waterGlow: '#4f9bb5',
    decor: '#5c8442',
  },
};

const EFFECT_COLORS: Record<string, [string, string]> = {
  fogo: ['#ff7a2a', '#ffd166'],
  gelo: ['#7ad0ff', '#e0f4ff'],
  impacto: ['#f4f4f4', '#b8b8b8'],
  brado: ['#ffd166', '#fff0c0'],
  natureza: ['#8fd06a', '#d8f0b0'],
  cura: ['#7ce0a0', '#d8ffe8'],
  perfuracao: ['#fff0c0', '#ffffff'],
  mana: ['#6aa8ff', '#c0dcff'],
  flecha: ['#d8c090', '#fff0c0'],
  chama: ['#ff8a3a', '#ffd166'],
};

export interface DrawParams {
  state: SimState;
  grid: Grid;
  theme: string;
  /** Efeitos ativos. O renderizador só lê. */
  fx: readonly Fx[];
  /** Fração do tick já decorrida, 0..1 — deixa o movimento fluido a 60fps. */
  alpha: number;
}

export function drawScene(ctx: CanvasRenderingContext2D, params: DrawParams): void {
  const { state, grid, fx, alpha } = params;
  const theme = THEMES[params.theme] ?? THEMES.caverna!;
  const nowMs = state.timeMs + alpha * TICK_MS;

  ctx.imageSmoothingEnabled = false;
  drawFloor(ctx, grid, theme, nowMs);
  drawGroundEffects(ctx, fx, nowMs);

  // Ordenação por linha: quem está mais ao sul desenha por cima.
  const ordered = [...state.combatants].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? 1 : -1;
    return a.pos.y - b.pos.y || a.pos.x - b.pos.x;
  });

  const flashes = collectFlashes(fx, nowMs);
  for (const combatant of ordered) {
    drawCombatant(ctx, combatant, alpha, flashes.get(combatant.id) ?? 0);
  }

  drawMissiles(ctx, fx, nowMs);
  drawFloatingText(ctx, fx, nowMs, grid);
}

// ---------------------------------------------------------------------------
// Cenário
// ---------------------------------------------------------------------------

function drawFloor(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  theme: Theme,
  nowMs: number,
): void {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const terrain = terrainAt(grid, x, y);

      if (terrain === 'parede') {
        ctx.fillStyle = theme.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = theme.wallTop;
        ctx.fillRect(px, py, TILE, 6);
        continue;
      }

      if (terrain === 'agua') {
        ctx.fillStyle = theme.water;
        ctx.fillRect(px, py, TILE, TILE);
        // Brilho lento, só para a poça não parecer um adesivo.
        const pulse = 0.25 + 0.15 * Math.sin(nowMs / 900 + (x + y) * 0.7);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = theme.waterGlow;
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.globalAlpha = 1;
        continue;
      }

      ctx.fillStyle = (x + y) % 2 === 0 ? theme.floorA : theme.floorB;
      ctx.fillRect(px, py, TILE, TILE);

      if (terrain === 'decoracao') {
        ctx.fillStyle = theme.decor;
        ctx.fillRect(px + 8, py + 10, TILE - 16, TILE - 18);
        ctx.fillRect(px + 12, py + 6, TILE - 24, 6);
      }

      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Combatentes
// ---------------------------------------------------------------------------

/** Posição visual interpolada entre o tile de origem e o de destino. */
function screenPos(c: Combatant, alpha: number): { x: number; y: number } {
  if (!c.moveFrom) return { x: c.pos.x * TILE, y: c.pos.y * TILE };

  const extra = alpha * (TICK_MS / Math.max(TICK_MS, c.moveDurationMs));
  const t = Math.min(1, c.moveProgress + extra);
  return {
    x: (c.moveFrom.x + (c.pos.x - c.moveFrom.x) * t) * TILE,
    y: (c.moveFrom.y + (c.pos.y - c.moveFrom.y) * t) * TILE,
  };
}

function collectFlashes(fx: readonly Fx[], nowMs: number): Map<string, number> {
  const flashes = new Map<string, number>();
  for (const effect of fx) {
    if (effect.kind !== 'dano' || !effect.entityId) continue;
    const age = nowMs - effect.tMs;
    if (age < 0 || age > HIT_FLASH_MS) continue;
    const intensity = 1 - age / HIT_FLASH_MS;
    flashes.set(effect.entityId, Math.max(flashes.get(effect.entityId) ?? 0, intensity));
  }
  return flashes;
}

function drawCombatant(
  ctx: CanvasRenderingContext2D,
  c: Combatant,
  alpha: number,
  flash: number,
): void {
  const sprite = getSprite(c.sprite, 2);
  if (!sprite) return;

  const base = screenPos(c, alpha);
  // Tremida ao apanhar: 2px que fazem o golpe parecer ter peso.
  const shake = flash > 0 ? Math.round(Math.sin(flash * 24) * 2) : 0;
  const scale = c.scale ?? 1;
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const x = base.x + (TILE - width) / 2 + shake;
  const y = base.y + (TILE - height) - 2;

  if (!c.alive) {
    const fade = Math.max(0, Math.min(1, c.corpseMs / CORPSE_MS));
    ctx.globalAlpha = fade * 0.55;
    ctx.fillStyle = '#7a1520';
    ctx.beginPath();
    ctx.ellipse(base.x + TILE / 2, base.y + TILE - 6, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade * 0.4;
    ctx.drawImage(sprite, x, y + 6, width, height);
    ctx.globalAlpha = 1;
    return;
  }

  ctx.drawImage(sprite, x, y, width, height);

  if (flash > 0) {
    const flashSprite = getSpriteFlash(c.sprite, 2);
    if (flashSprite) {
      ctx.globalAlpha = flash * 0.75;
      ctx.drawImage(flashSprite, x, y, width, height);
      ctx.globalAlpha = 1;
    }
  }

  drawNameplate(ctx, c, base.x + TILE / 2, y - 3);
}

function drawNameplate(
  ctx: CanvasRenderingContext2D,
  c: Combatant,
  centerX: number,
  bottomY: number,
): void {
  const barWidth = 24;
  const barX = centerX - barWidth / 2;
  const barY = bottomY - 4;

  ctx.fillStyle = '#000000';
  ctx.fillRect(barX - 1, barY - 1, barWidth + 2, 5);

  const pct = Math.max(0, Math.min(1, c.hp / c.maxHp));
  ctx.fillStyle = c.side === 'party' ? healthColor(pct) : '#c0392b';
  ctx.fillRect(barX, barY, Math.round(barWidth * pct), 3);

  ctx.font = '600 8px ui-monospace, "SFMono-Regular", Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(c.name, centerX, barY - 2);
  ctx.fillStyle = c.side === 'party' ? '#8fe0a8' : '#e88a7a';
  ctx.fillText(c.name, centerX, barY - 2);
}

function healthColor(pct: number): string {
  if (pct > 0.6) return '#5ec26a';
  if (pct > 0.3) return '#d8b34a';
  return '#d0503c';
}

// ---------------------------------------------------------------------------
// Efeitos
// ---------------------------------------------------------------------------

function drawGroundEffects(
  ctx: CanvasRenderingContext2D,
  fx: readonly Fx[],
  nowMs: number,
): void {
  for (const effect of fx) {
    if (effect.kind !== 'efeito') continue;
    const t = progress(effect, nowMs);
    if (t === null) continue;

    const [core, halo] = EFFECT_COLORS[effect.effect ?? ''] ?? ['#ffffff', '#dddddd'];
    const cx = effect.pos.x * TILE + TILE / 2;
    const cy = effect.pos.y * TILE + TILE / 2;
    // O efeito precisa caber no tile: um raio maior que meio tile vira uma
    // mancha que cobre os personagens e a cena deixa de ser legível.
    const radius = TILE * (0.16 + t * 0.28);

    // Blending aditivo: cor de magia deve parecer luz, não tinta por cima.
    ctx.globalCompositeOperation = 'lighter';

    ctx.globalAlpha = (1 - t) * 0.45;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

function drawMissiles(
  ctx: CanvasRenderingContext2D,
  fx: readonly Fx[],
  nowMs: number,
): void {
  for (const effect of fx) {
    if (effect.kind !== 'projetil' || !effect.to) continue;
    const t = progress(effect, nowMs);
    if (t === null) continue;

    const [core, halo] = EFFECT_COLORS[effect.effect ?? ''] ?? ['#ffffff', '#dddddd'];
    const x = (effect.pos.x + (effect.to.x - effect.pos.x) * t) * TILE + TILE / 2;
    const y = (effect.pos.y + (effect.to.y - effect.pos.y) * t) * TILE + TILE / 2;

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloatingText(
  ctx: CanvasRenderingContext2D,
  fx: readonly Fx[],
  nowMs: number,
  grid: Grid,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const effect of fx) {
    const t = progress(effect, nowMs);
    if (t === null) continue;

    let text: string | null = null;
    let color = '#ffffff';
    let size = 10;
    let rise = 18;

    switch (effect.kind) {
      case 'dano':
        text = String(effect.value ?? 0);
        color = effect.side === 'party' ? '#ff5a4a' : '#ffe08a';
        size = effect.side === 'party' ? 11 : 10;
        break;
      case 'cura':
        text = `+${effect.value ?? 0}`;
        color = '#7ce0a0';
        break;
      case 'gold':
        text = `+${effect.value ?? 0} gold`;
        color = '#e8c14a';
        rise = 22;
        break;
      case 'fala':
        text = effect.text ?? null;
        color = effect.side === 'party' ? '#c8a8ff' : '#ffb0a0';
        size = 9;
        rise = 6;
        break;
      case 'aviso':
        text = effect.text ?? null;
        color = '#ff8a5a';
        size = 14;
        rise = 4;
        break;
      default:
        continue;
    }

    if (!text) continue;

    const x = effect.kind === 'aviso' ? (grid.width * TILE) / 2 : effect.pos.x * TILE + TILE / 2;
    const y = effect.pos.y * TILE + TILE / 2 - 12 - t * rise;

    ctx.globalAlpha = 1 - t * t;
    ctx.font = `700 ${size}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }
}

/** Progresso 0..1 do efeito, ou `null` se ainda não começou ou já acabou. */
function progress(effect: Fx, nowMs: number): number | null {
  const age = nowMs - effect.tMs;
  if (age < 0 || age >= effect.durationMs) return null;
  return age / effect.durationMs;
}
