/**
 * PRNG determinístico (mulberry32).
 *
 * O estado do personagem carrega `rngSeed`, então cliente e servidor produzem
 * exatamente a mesma sequência de rolagens a partir do mesmo snapshot. É isso
 * que permite ao cliente prever o combate localmente enquanto o servidor
 * permanece a fonte da verdade.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // >>> 0 garante inteiro sem sinal de 32 bits mesmo com seeds "sujas".
    this.state = seed >>> 0;
  }

  /** Semente atual, para persistir no save. */
  get seed(): number {
    return this.state >>> 0;
  }

  /** Float em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max] (inclusivo nas duas pontas). */
  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** `true` com a probabilidade informada (0..1). */
  chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }

  /** Escolhe um item respeitando pesos relativos. */
  weighted<T>(entries: readonly { weight: number; value: T }[]): T | null {
    let total = 0;
    for (const entry of entries) total += Math.max(0, entry.weight);
    if (total <= 0) return null;

    let roll = this.next() * total;
    for (const entry of entries) {
      roll -= Math.max(0, entry.weight);
      if (roll < 0) return entry.value;
    }
    return entries[entries.length - 1]?.value ?? null;
  }
}

/** Semente inicial para um personagem novo. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
