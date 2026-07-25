#!/usr/bin/env node
/**
 * Monta o atlas de sprites a partir do OpenTibia Sprite Pack (CC BY 4.0).
 *
 *   node scripts/build-atlas.mjs <caminho-do-pack>
 *
 * O pack não é versionado aqui: clone-o à parte e aponte para ele. A saída
 * (atlas.png + atlas.json) é o que entra no repositório, com os créditos em
 * ASSETS.md, como a licença exige.
 *
 *   git clone --depth 1 https://github.com/peonso/opentibia_sprite_pack
 *   node scripts/build-atlas.mjs ./opentibia_sprite_pack
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Image, decodePng, encodePng } from './lib/png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TILE = 32;
const FRAMES = 3;

const packPath = process.argv[2];
if (!packPath || !existsSync(packPath)) {
  console.error('Uso: node scripts/build-atlas.mjs <caminho-do-opentibia_sprite_pack>');
  process.exit(1);
}

const sheetPath = (name) => join(packPath, 'sprite_sheets', `${name}.png`);

/**
 * Criaturas: cada entrada aponta para a linha e a coluna inicial de uma
 * sequência de caminhada na folha do pack.
 */
const CREATURES = {
  gato: { sheet: 'otsp_creatures_01', row: 0, col: 4 },
  diabrete: { sheet: 'otsp_creatures_01', row: 1, col: 0 },
  esqueleto: { sheet: 'otsp_creatures_01', row: 2, col: 5 },
  espectro: { sheet: 'otsp_creatures_01', row: 3, col: 7 },
  javali: { sheet: 'otsp_creatures_01', row: 4, col: 3 },
  lobo: { sheet: 'otsp_creatures_01', row: 5, col: 2 },
  goblin: { sheet: 'otsp_creatures_02', row: 0, col: 1 },
};

/**
 * Vocações: o pack traz um outfit humano com a máscara de colorização do
 * Tibia — amarelo, vermelho, verde e azul marcam cabeça, corpo, pernas e pés.
 * Recolorir por canal transforma um único sprite nas quatro vocações.
 */
const OUTFIT = {
  sheet: 'otsp_creatures_03',
  baseCol: 1,
  maskCol: 3,
  rows: [1, 3, 5],
};

const PALETTES = {
  knight: { head: [154, 163, 180], body: [92, 102, 121], legs: [51, 58, 71], feet: [42, 47, 58] },
  paladin: { head: [216, 192, 112], body: [138, 115, 69], legs: [74, 63, 42], feet: [58, 48, 32] },
  sorcerer: { head: [138, 90, 190], body: [74, 42, 122], legs: [42, 24, 69], feet: [31, 18, 53] },
  druid: { head: [95, 158, 106], body: [53, 107, 69], legs: [36, 66, 44], feet: [28, 51, 34] },
};

const MASK_CHANNELS = [
  { part: 'head', color: [255, 255, 0] },
  { part: 'body', color: [255, 0, 0] },
  { part: 'legs', color: [0, 255, 0] },
  { part: 'feet', color: [0, 0, 255] },
];

const sheetCache = new Map();

function loadSheet(name) {
  let sheet = sheetCache.get(name);
  if (!sheet) {
    sheet = decodePng(readFileSync(sheetPath(name)));
    // O pack usa magenta como cor de transparência, à moda do formato .spr.
    sheet.keyOut(255, 0, 255);
    sheetCache.set(name, sheet);
  }
  return sheet;
}

function nearest(color, target, tolerance = 70) {
  return (
    Math.abs(color[0] - target[0]) <= tolerance &&
    Math.abs(color[1] - target[1]) <= tolerance &&
    Math.abs(color[2] - target[2]) <= tolerance
  );
}

/**
 * Aplica a paleta da vocação sobre o sprite base, guiado pela máscara.
 *
 * Multiplicamos a cor escolhida pela luminância do pixel original: assim as
 * dobras da armadura e as sombras sobrevivem à troca de cor, em vez de virar
 * um recorte chapado.
 */
function colorize(base, mask, palette) {
  const out = new Image(base.width, base.height);

  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      const [r, g, b, a] = base.get(x, y);
      if (a === 0) continue;

      const [mr, mg, mb, ma] = mask.get(x, y);
      let tint = null;
      if (ma > 0) {
        for (const channel of MASK_CHANNELS) {
          if (nearest([mr, mg, mb], channel.color)) {
            tint = palette[channel.part];
            break;
          }
        }
      }

      if (!tint) {
        out.set(x, y, r, g, b, a);
        continue;
      }

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const boost = Math.min(1.35, luminance * 1.55);
      out.set(
        x,
        y,
        Math.min(255, Math.round(tint[0] * boost)),
        Math.min(255, Math.round(tint[1] * boost)),
        Math.min(255, Math.round(tint[2] * boost)),
        a,
      );
    }
  }

  return out;
}

// --- coleta -----------------------------------------------------------------

const collected = [];

for (const [name, spec] of Object.entries(CREATURES)) {
  const sheet = loadSheet(spec.sheet);
  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    frames.push(sheet.crop((spec.col + i) * TILE, spec.row * TILE, TILE, TILE));
  }
  collected.push({ name, frames });
}

{
  const sheet = loadSheet(OUTFIT.sheet);
  for (const [vocation, palette] of Object.entries(PALETTES)) {
    const frames = OUTFIT.rows.map((row) => {
      const base = sheet.crop(OUTFIT.baseCol * TILE, row * TILE, TILE, TILE);
      const mask = sheet.crop(OUTFIT.maskCol * TILE, row * TILE, TILE, TILE);
      return colorize(base, mask, palette);
    });
    collected.push({ name: vocation, frames });
  }
}

// --- empacotamento ----------------------------------------------------------
// Tudo tem 32×32, então a grade resolve — não precisa de max-rects.

const columns = FRAMES;
const atlas = new Image(columns * TILE, collected.length * TILE);
const manifest = { tile: TILE, frames: FRAMES, sprites: {} };

collected.forEach((entry, row) => {
  const positions = [];
  entry.frames.forEach((frame, column) => {
    const x = column * TILE;
    const y = row * TILE;
    atlas.blit(frame, x, y);
    positions.push([x, y]);
  });
  manifest.sprites[entry.name] = positions;
});

mkdirSync(join(ROOT, 'apps/web/public'), { recursive: true });
writeFileSync(join(ROOT, 'apps/web/public/atlas.png'), encodePng(atlas));
writeFileSync(
  join(ROOT, 'apps/web/src/game/atlas.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const empty = collected.filter((entry) => entry.frames.every((frame) => frame.isEmpty()));
if (empty.length > 0) {
  console.warn(`\n⚠ sprites vazios (confira linha/coluna): ${empty.map((e) => e.name).join(', ')}`);
}

console.log(`atlas.png — ${atlas.width}×${atlas.height}, ${collected.length} sprites`);
for (const entry of collected) {
  const bounds = entry.frames[0].bounds();
  console.log(`  ${entry.name.padEnd(12)} ${bounds ? `${bounds.width}×${bounds.height}` : 'VAZIO'}`);
}
