#!/usr/bin/env node
/**
 * Gera os ícones do PWA sem depender de nenhuma biblioteca de imagem.
 *
 * O desenho é procedural (a boca de um covil, com dois olhos acesos lá dentro)
 * e o PNG é codificado à mão com node:zlib. Zero dependências, resultado
 * reproduzível e nenhum binário opaco entrando no repositório sem origem.
 *
 *   node scripts/gen-icons.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'apps/web/public');

// --- codificação PNG --------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // Cada linha é precedida do byte de filtro (0 = nenhum).
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- desenho ----------------------------------------------------------------

const COLORS = {
  bgOuter: [0x0b, 0x0a, 0x09],
  bgInner: [0x24, 0x1d, 0x18],
  mouth: [0x07, 0x06, 0x05],
  rim: [0xd8, 0xab, 0x4a],
  rimDeep: [0x8a, 0x6a, 0x24],
  eye: [0xff, 0x8a, 0x3a],
  ground: [0x3a, 0x33, 0x2e],
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function mix(a, b, t) {
  // O clamp não é decoração: `t` fora de 0..1 extrapola a cor, estoura o byte
  // e vira faixa de arco-íris na imagem final.
  const k = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

/** Cor do ponto (x, y) em coordenadas normalizadas 0..1. */
function shade(x, y, inset) {
  // `inset` encolhe o desenho para caber na zona segura do ícone maskable.
  const sx = 0.5 + (x - 0.5) / inset;
  const sy = 0.5 + (y - 0.5) / inset;

  const distCenter = Math.hypot(x - 0.5, y - 0.5);
  let color = mix(COLORS.bgInner, COLORS.bgOuter, Math.min(1, distCenter * 1.7));

  const archCenterY = 0.44;
  const radius = 0.235;
  const bottom = 0.8;
  const dx = sx - 0.5;

  // Distância assinada até a boca do covil: semicírculo em cima, reto embaixo.
  const distArch =
    sy < archCenterY ? Math.hypot(dx, sy - archCenterY) - radius : Math.abs(dx) - radius;
  const rimWidth = 0.045;
  const inside = distArch <= 0 && sy <= bottom;
  // A borda só existe para fora da abertura; abaixo da base quem manda é o chão.
  const onRim = distArch > 0 && distArch <= rimWidth && sy <= bottom;
  const onGround =
    sy > bottom && sy <= bottom + 0.055 && Math.abs(dx) <= radius + rimWidth * 1.6;

  if (onGround) {
    color = mix(color, COLORS.ground, 0.75);
  } else if (onRim) {
    const t = clamp01(distArch / rimWidth);
    color = mix(COLORS.rim, COLORS.rimDeep, t);
  } else if (inside) {
    // Escurece em direção ao fundo da caverna.
    const depth = Math.min(1, Math.max(0, (sy - archCenterY + radius) / (bottom - archCenterY + radius)));
    color = mix(COLORS.mouth, [0x03, 0x02, 0x02], depth * 0.6);

    for (const eyeX of [0.5 - 0.082, 0.5 + 0.082]) {
      const distEye = Math.hypot(sx - eyeX, sy - 0.565);
      if (distEye < 0.036) {
        color = mix(COLORS.eye, color, clamp01(distEye / 0.036) ** 2);
      } else if (distEye < 0.075) {
        color = mix(color, COLORS.eye, 0.28 * (1 - (distEye - 0.036) / 0.039));
      }
    }
  }

  return color;
}

function renderIcon(size, { inset = 1, transparentCorners = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 3; // supersampling: 3x3 por pixel

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;

          let alpha = 255;
          if (transparentCorners) {
            // Canto arredondado para o ícone comum (o maskable é full-bleed).
            const radius = 0.22;
            const qx = Math.abs(x - 0.5) - (0.5 - radius);
            const qy = Math.abs(y - 0.5) - (0.5 - radius);
            const outside =
              Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius + Math.min(Math.max(qx, qy), 0);
            if (outside > 0) alpha = 0;
          }

          const [cr, cg, cb] = shade(x, y, inset);
          r += cr;
          g += cg;
          b += cb;
          a += alpha;
        }
      }

      const total = samples * samples;
      const offset = (py * size + px) * 4;
      rgba[offset] = Math.round(r / total);
      rgba[offset + 1] = Math.round(g / total);
      rgba[offset + 2] = Math.round(b / total);
      rgba[offset + 3] = Math.round(a / total);
    }
  }

  return encodePng(size, size, rgba);
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#12100f"/>
  <path d="M26.5 80V44a23.5 23.5 0 0 1 47 0v36z" fill="none" stroke="#d8ab4a" stroke-width="8"/>
  <path d="M30.5 80V44a19.5 19.5 0 0 1 39 0v36z" fill="#070605"/>
  <circle cx="41.8" cy="56.5" r="3.6" fill="#ff8a3a"/>
  <circle cx="58.2" cy="56.5" r="3.6" fill="#ff8a3a"/>
</svg>
`;

// --- execução ---------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ['icon-192.png', renderIcon(192, { transparentCorners: true })],
  ['icon-512.png', renderIcon(512, { transparentCorners: true })],
  // Maskable precisa de margem: o sistema recorta até 20% de cada borda.
  ['icon-maskable-512.png', renderIcon(512, { inset: 0.72 })],
  ['apple-touch-icon.png', renderIcon(180)],
];

for (const [name, buffer] of outputs) {
  writeFileSync(join(OUT_DIR, name), buffer);
  console.log(`  ${name} — ${(buffer.length / 1024).toFixed(1)} KB`);
}

writeFileSync(join(OUT_DIR, 'favicon.svg'), FAVICON_SVG);
console.log('  favicon.svg');
console.log(`\nÍcones gerados em ${OUT_DIR}`);
