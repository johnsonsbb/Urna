/**
 * Leitura e escrita de PNG sem dependências, sobre node:zlib.
 *
 * Existe para o pipeline de assets: o pack de sprites vem em folhas PNG com
 * magenta como cor de transparência, e precisamos recortar, converter e
 * reempacotar sem trazer uma biblioteca de imagem para o projeto.
 */

import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

/** Imagem em memória: RGBA de 8 bits, sem entrelaçamento. */
export class Image {
  constructor(width, height, data) {
    this.width = width;
    this.height = height;
    this.data = data ?? Buffer.alloc(width * height * 4);
  }

  get(x, y) {
    const offset = (y * this.width + x) * 4;
    return [this.data[offset], this.data[offset + 1], this.data[offset + 2], this.data[offset + 3]];
  }

  set(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 4;
    this.data[offset] = r;
    this.data[offset + 1] = g;
    this.data[offset + 2] = b;
    this.data[offset + 3] = a;
  }

  crop(x, y, width, height) {
    const out = new Image(width, height);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const sx = x + col;
        const sy = y + row;
        if (sx < 0 || sy < 0 || sx >= this.width || sy >= this.height) continue;
        const [r, g, b, a] = this.get(sx, sy);
        out.set(col, row, r, g, b, a);
      }
    }
    return out;
  }

  scale(factor) {
    const out = new Image(this.width * factor, this.height * factor);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        const [r, g, b, a] = this.get(Math.floor(x / factor), Math.floor(y / factor));
        out.set(x, y, r, g, b, a);
      }
    }
    return out;
  }

  blit(source, x, y) {
    for (let row = 0; row < source.height; row++) {
      for (let col = 0; col < source.width; col++) {
        const [r, g, b, a] = source.get(col, row);
        if (a === 0) continue;
        this.set(x + col, y + row, r, g, b, a);
      }
    }
  }

  fill(r, g, b, a = 255) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = a;
    }
  }

  /** Converte uma cor-chave (tipicamente magenta) em transparência. */
  keyOut(kr, kg, kb, tolerance = 24) {
    for (let i = 0; i < this.data.length; i += 4) {
      if (
        Math.abs(this.data[i] - kr) <= tolerance &&
        Math.abs(this.data[i + 1] - kg) <= tolerance &&
        Math.abs(this.data[i + 2] - kb) <= tolerance
      ) {
        this.data[i + 3] = 0;
      }
    }
  }

  /** `true` se não houver nenhum pixel visível. */
  isEmpty() {
    for (let i = 3; i < this.data.length; i += 4) {
      if (this.data[i] !== 0) return false;
    }
    return true;
  }

  /** Caixa dos pixels visíveis, ou `null` se a imagem estiver vazia. */
  bounds() {
    let minX = this.width;
    let minY = this.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[(y * this.width + x) * 4 + 3] === 0) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
}

// --- decodificação ----------------------------------------------------------

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Não é um PNG');

  let offset = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!header) throw new Error('PNG sem IHDR');
  if (header.bitDepth !== 8) throw new Error(`Profundidade ${header.bitDepth} não suportada`);
  if (header.interlace !== 0) throw new Error('PNG entrelaçado não suportado');

  const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`Tipo de cor ${header.colorType} não suportado`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  // Desfaz os filtros por scanline (spec do PNG, seção 9).
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;

    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let i = 0; i < stride; i++) {
      const rawByte = line[i];
      const left = i >= channels ? out[i - channels] : 0;
      const up = prior ? prior[i] : 0;
      const upLeft = prior && i >= channels ? prior[i - channels] : 0;

      switch (filter) {
        case 0:
          out[i] = rawByte;
          break;
        case 1:
          out[i] = (rawByte + left) & 0xff;
          break;
        case 2:
          out[i] = (rawByte + up) & 0xff;
          break;
        case 3:
          out[i] = (rawByte + ((left + up) >> 1)) & 0xff;
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          out[i] = (rawByte + predictor) & 0xff;
          break;
        }
        default:
          throw new Error(`Filtro desconhecido: ${filter}`);
      }
    }
  }

  // Normaliza tudo para RGBA.
  const image = new Image(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * stride + x * channels;
      let r;
      let g;
      let b;
      let a = 255;

      switch (header.colorType) {
        case 0:
          r = g = b = pixels[src];
          break;
        case 2:
          r = pixels[src];
          g = pixels[src + 1];
          b = pixels[src + 2];
          break;
        case 3: {
          const index = pixels[src];
          r = palette[index * 3];
          g = palette[index * 3 + 1];
          b = palette[index * 3 + 2];
          if (transparency && index < transparency.length) a = transparency[index];
          break;
        }
        case 4:
          r = g = b = pixels[src];
          a = pixels[src + 1];
          break;
        default:
          r = pixels[src];
          g = pixels[src + 1];
          b = pixels[src + 2];
          a = pixels[src + 3];
      }

      image.set(x, y, r, g, b, a);
    }
  }

  return image;
}

// --- codificação ------------------------------------------------------------

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

export function encodePng(image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = image.width * 4;
  const raw = Buffer.alloc(image.height * (stride + 1));
  for (let y = 0; y < image.height; y++) {
    const start = y * (stride + 1);
    raw[start] = 0;
    image.data.copy(raw, start + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Fonte 3×5 para os rótulos da folha de contato. */
const DIGITS = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

export function drawText(image, text, x, y, [r, g, b] = [255, 255, 255], scale = 1) {
  let cursor = x;
  for (const char of String(text)) {
    const glyph = DIGITS[char];
    if (!glyph) {
      cursor += 4 * scale;
      continue;
    }
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (glyph[row][col] !== '1') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            image.set(cursor + col * scale + dx, y + row * scale + dy, r, g, b, 255);
          }
        }
      }
    }
    cursor += 4 * scale;
  }
}
