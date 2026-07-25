/**
 * Atlas de sprites.
 *
 * A arte vem do OpenTibia Sprite Pack (CC BY 4.0) — ver ASSETS.md. O atlas é
 * gerado por `scripts/build-atlas.mjs`, que recorta as folhas do pack, remove
 * o magenta de transparência e recolore o outfit humano nas quatro vocações
 * usando a máscara de canais do Tibia.
 */

import manifest from './atlas.json';

interface AtlasManifest {
  tile: number;
  frames: number;
  /** Cada quadro é um par [x, y] dentro do atlas; todos têm `tile` de lado. */
  sprites: Record<string, number[][]>;
}

const ATLAS: AtlasManifest = manifest;

export const ATLAS_TILE = ATLAS.tile;
export const ATLAS_FRAMES = ATLAS.frames;

let sheet: HTMLImageElement | null = null;

/** Carrega o atlas. Chame antes de montar a árvore React. */
export function loadAtlas(src = '/atlas.png'): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      sheet = image;
      resolve();
    };
    // Falhar no carregamento não pode derrubar o jogo: seguimos sem sprites,
    // com as barras de vida e os números ainda legíveis na tela.
    image.onerror = () => resolve();
    image.src = src;
  });
}

export interface Frame {
  image: HTMLImageElement;
  sx: number;
  sy: number;
  size: number;
}

export function getFrame(name: string, frameIndex = 0): Frame | null {
  if (!sheet) return null;
  const frames = ATLAS.sprites[name];
  if (!frames || frames.length === 0) return null;

  const position = frames[frameIndex % frames.length] ?? frames[0]!;
  return { image: sheet, sx: position[0] ?? 0, sy: position[1] ?? 0, size: ATLAS.tile };
}

export function hasSprite(name: string): boolean {
  return Boolean(ATLAS.sprites[name]);
}

const flashCache = new Map<string, HTMLCanvasElement>();

/** Silhueta branca do quadro, usada no flash de quem apanhou. */
export function getFlashFrame(name: string, frameIndex = 0): HTMLCanvasElement | null {
  const key = `${name}:${frameIndex}`;
  const cached = flashCache.get(key);
  if (cached) return cached;

  const frame = getFrame(name, frameIndex);
  if (!frame) return null;

  const canvas = document.createElement('canvas');
  canvas.width = frame.size;
  canvas.height = frame.size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.image, frame.sx, frame.sy, frame.size, frame.size, 0, 0, frame.size, frame.size);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  flashCache.set(key, canvas);
  return canvas;
}

const avatarCache = new Map<string, string>();

/** Retrato do sprite como data URL, para as listas da interface. */
export function getSpriteDataUrl(name: string, scale = 2): string {
  const key = `${name}@${scale}`;
  const cached = avatarCache.get(key);
  if (cached) return cached;

  const frame = getFrame(name, 0);
  if (!frame) return '';

  const canvas = document.createElement('canvas');
  canvas.width = frame.size * scale;
  canvas.height = frame.size * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    frame.image,
    frame.sx,
    frame.sy,
    frame.size,
    frame.size,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const url = canvas.toDataURL();
  avatarCache.set(key, url);
  return url;
}
