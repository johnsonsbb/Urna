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
      // O padrão do pt-BR é "AU$", que com 44px de Plex Mono não cabe nos
      // 320px. Moeda é uma só no app inteiro, então "$" não é ambíguo.
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    CACHE.set(locale, f);
  }
  return f;
}

/** "$ 1.234,56" em pt-BR, "$1,234.56" em en-AU. */
export function formatMoney(amountInCents: number, locale: Locale = 'pt-BR'): string {
  return formatter(locale).format(amountInCents / 100);
}

/**
 * Texto digitado -> centavos. Aceita "12", "12,50", "12.50" e "1.234,56", e
 * ignora o que não for dígito ou separador. Devolve null quando não sobra
 * número nenhum. O sinal é decidido pelo `flow`, então o valor volta positivo.
 */
export function parseAmountToCents(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const separator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  let whole = cleaned;
  let fraction = '';

  if (separator >= 0) {
    const tail = cleaned.slice(separator + 1);
    // Até dois dígitos depois do separador são centavos; três ou mais é
    // separador de milhar ("1.234").
    if (tail.length > 0 && tail.length <= 2) {
      whole = cleaned.slice(0, separator);
      fraction = tail;
    }
  }

  const digits = whole.replace(/\D/g, '');
  if (!digits && !fraction) return null;

  return Number(digits || '0') * 100 + Number(`${fraction}00`.slice(0, 2));
}

/** Centavos -> texto editável no campo, sem símbolo de moeda. */
export function centsToInput(amountInCents: number, locale: Locale = 'pt-BR'): string {
  const text = (amountInCents / 100).toFixed(2);
  return locale === 'pt-BR' ? text.replace('.', ',') : text;
}
