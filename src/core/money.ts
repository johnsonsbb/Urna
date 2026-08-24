import type { Locale } from './types';

/**
 * Dinheiro é inteiro em centavos. A divisão por 100 acontece só aqui, na borda
 * de exibição, e o resultado nunca volta para o modelo.
 */

const CACHE = new Map<Locale, Intl.NumberFormat>();

function formatter(locale: Locale): Intl.NumberFormat {
  let f = CACHE.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    CACHE.set(locale, f);
  }
  return f;
}

/** "A$ 1.234,56" em pt-BR, "$1,234.56" em en-AU. */
export function formatMoney(amountInCents: number, locale: Locale = 'pt-BR'): string {
  return formatter(locale).format(amountInCents / 100);
}
