/**
 * Sprites provisórios, desenhados como matrizes de pixels.
 *
 * São PLACEHOLDERS. A arte final vem do OpenTibia Sprite Pack (CC BY 4.0),
 * carregada por um atlas. Estes existem para validar o movimento, o combate e
 * o enquadramento da arena sem depender do pipeline de assets — e para o
 * repositório não carregar binário antes da hora.
 *
 * '.' é transparente; qualquer outro caractere indexa a paleta do sprite.
 */

export interface SpriteDef {
  palette: Record<string, string>;
  rows: readonly string[];
}

const SKIN = '#e8b48a';
const EYE = '#1b1416';

export const SPRITES: Record<string, SpriteDef> = {
  knight: {
    palette: {
      e: '#c0392b',
      h: '#9aa3b4',
      s: SKIN,
      i: EYE,
      t: '#d8ab4a',
      b: '#5c6679',
      l: '#333a47',
    },
    rows: [
      '................',
      '.......ee.......',
      '......hhhh......',
      '.....hhhhhh.....',
      '.....hsiish.....',
      '.....hssssh.....',
      '......ssss......',
      '....ttbbbbtt....',
      '...ttbbbbbbtt...',
      '...tbbbbbbbbt...',
      '...tbbbbbbbbt...',
      '....bbbbbbbb....',
      '.....llllll.....',
      '.....ll..ll.....',
      '....lll..lll....',
      '................',
    ],
  },

  paladin: {
    palette: {
      h: '#b98f4a',
      s: SKIN,
      i: EYE,
      t: '#e0c473',
      b: '#8a7345',
      l: '#4a3f2a',
      w: '#6b4a2a',
    },
    rows: [
      '................',
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '.....ssssss.....',
      '.....sisis......',
      '......ssss......',
      '....tbbbbbbt..w.',
      '...tbbbbbbbbt.w.',
      '....bbbbbbbb..w.',
      '....bbbbbbbb..w.',
      '.....llllll.....',
      '.....ll..ll.....',
      '....lll..lll....',
      '................',
    ],
  },

  sorcerer: {
    palette: {
      h: '#6d3f9c',
      s: SKIN,
      i: EYE,
      b: '#4a2a7a',
      t: '#b26bd8',
      l: '#2a1845',
      w: '#7a5a3a',
      g: '#d98cf0',
    },
    rows: [
      '.......hh.......',
      '......hhhh......',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '.....ssssss.....',
      '.....sisis......',
      '......ssss......',
      '....tbbbbbbt.g..',
      '...bbbbbbbbbbw..',
      '...bbbbbbbbb.w..',
      '....bbbbbbbb.w..',
      '....bbbbbbbb.w..',
      '.....bbbbbb.....',
      '....llll.llll...',
      '................',
    ],
  },

  druid: {
    palette: {
      h: '#3f7a4a',
      s: SKIN,
      i: EYE,
      b: '#356b45',
      t: '#8fd06a',
      l: '#24422c',
      w: '#7a5a3a',
      g: '#8fd06a',
    },
    rows: [
      '................',
      '......hhhh......',
      '.....hhhhhh.....',
      '....hhssssh.....',
      '....hhsisih.....',
      '.....hssssh.....',
      '......ssss......',
      '....tbbbbbbt.g..',
      '...bbbbbbbbbbw..',
      '...bbbbbbbbb.w..',
      '...bbbbbbbbb.w..',
      '....bbbbbbbb.w..',
      '....bbbbbbbb....',
      '.....bbbbbb.....',
      '....llll.llll...',
      '................',
    ],
  },

  rato: {
    palette: { b: '#7a6a5c', i: EYE, t: '#a89684', d: '#5a4d43' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '..bb........bb..',
      '.bbbb......bbbb.',
      '.bbbbbbbbbbbbbb.',
      'bbibbbbbbbbbbbb.',
      'bbbbbbbbbbbbbb.t',
      '.bbbbbbbbbbbb.t.',
      '.ddd.dd..dd.dd..',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  aranha: {
    palette: { b: '#5a3a5c', i: '#d84a4a', l: '#3a2440' },
    rows: [
      '................',
      '................',
      '..l..........l..',
      '...l...ll...l...',
      '....l.llll.l....',
      '.....lbbbbl.....',
      '....lbbbbbbl....',
      '...l.bbbbbb.l...',
      '..l..bibbib..l..',
      '.l...bbbbbb...l.',
      '......bbbb......',
      '.......ll.......',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  goblin: {
    palette: { e: '#6a9a4a', h: '#7cb356', i: EYE, b: '#8a5a30', l: '#4a3520' },
    rows: [
      '................',
      '................',
      '...e........e...',
      '...ee.hhhh.ee...',
      '....ehhhhhhe....',
      '.....hiihhi.....',
      '......hhhh......',
      '.....bbbbbb.....',
      '....bbbbbbbb....',
      '....bbbbbbbb....',
      '.....bbbbbb.....',
      '.....ll..ll.....',
      '....lll..lll....',
      '................',
      '................',
      '................',
    ],
  },

  lobo: {
    palette: { b: '#4a4a56', i: '#e0a020', t: '#35353f', d: '#2a2a33' },
    rows: [
      '................',
      '................',
      '..bb............',
      '.bbbb...........',
      '.bbibb..bbbbb...',
      '.bbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbb.',
      '..bbbbbbbbbbbb.t',
      '...bbbbbbbbbb.tt',
      '...d.dd..dd.d...',
      '...d.dd..dd.d...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  orc: {
    palette: { h: '#6b8f4a', i: '#d8402a', w: '#e8e4d0', b: '#8a6a3a', l: '#4a3a24' },
    rows: [
      '................',
      '......hhhh......',
      '.....hhhhhh.....',
      '.....hiihhi.....',
      '.....hhwwhh.....',
      '......hhhh......',
      '...bbbbbbbbbb...',
      '..bbbbbbbbbbbb..',
      '..bbbbbbbbbbbb..',
      '...bbbbbbbbbb...',
      '....bbbbbbbb....',
      '....ll....ll....',
      '...lll....lll...',
      '................',
      '................',
      '................',
    ],
  },

  necrofago: {
    palette: { h: '#9aa08a', i: '#7ce0a0', b: '#5a5a4a', l: '#3a3a30' },
    rows: [
      '................',
      '................',
      '......hhhh......',
      '.....hiiiih.....',
      '.....hhhhhh.....',
      '......hhhh......',
      '....bbbbbbbb....',
      '...bbbbbbbbbb...',
      '...bbb.bb.bbb...',
      '....bbbbbbbb....',
      '.....bbbbbb.....',
      '.....ll..ll.....',
      '....lll..lll....',
      '................',
      '................',
      '................',
    ],
  },

  boss: {
    palette: {
      e: '#8a1a1a',
      h: '#3a2028',
      i: '#ff5a2a',
      w: '#e8e4d0',
      b: '#5a1f28',
      t: '#8a3040',
      l: '#2a1218',
    },
    rows: [
      '................',
      '..e..........e..',
      '..ee...hh...ee..',
      '...eehhhhhhee...',
      '....hhiihhii....',
      '....hhhwwhhh....',
      '.....hhhhhh.....',
      '...tbbbbbbbbt...',
      '..bbbbbbbbbbbb..',
      '.bbbbbbbbbbbbbb.',
      '.bbbbbbbbbbbbbb.',
      '..bbbbbbbbbbbb..',
      '...bbbbbbbbbb...',
      '....ll....ll....',
      '...lll....lll...',
      '................',
    ],
  },
};

const cache = new Map<string, HTMLCanvasElement>();

/** Rasteriza (e memoiza) um sprite no fator de escala pedido. */
export function getSprite(name: string, scale = 2): HTMLCanvasElement | null {
  const key = `${name}@${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const def = SPRITES[name];
  if (!def) return null;

  const height = def.rows.length;
  let width = 0;
  for (const row of def.rows) width = Math.max(width, row.length);

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    const row = def.rows[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      const char = row[x]!;
      if (char === '.') continue;
      const color = def.palette[char];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  cache.set(key, canvas);
  return canvas;
}

/** Silhueta branca do sprite, usada no flash de dano. */
export function getSpriteFlash(name: string, scale = 2): HTMLCanvasElement | null {
  const key = `${name}#flash@${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const base = getSprite(name, scale);
  if (!base) return null;

  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(base, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  cache.set(key, canvas);
  return canvas;
}
