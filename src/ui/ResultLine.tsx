import type { Totals } from '../core/day';
import { balanceOf, formatMoney } from '../core/money';
import type { Locale } from '../core/types';

/**
 * Entra, sai, sobra. A sobra é o número dominante da tela, em Plex Mono com
 * tabular-nums como todo valor do app.
 *
 * Sem cartão de propósito: em 320px o cartão comeria 32px de respiro interno e
 * o número de 44px não caberia. Separação por hairline, como manda a 8.4.
 */
export function ResultLine({ totals, locale }: { totals: Totals; locale: Locale }) {
  const balance = balanceOf(totals.left);

  return (
    <section className="mt-3 border-y border-hairline py-3" aria-label="Resultado da semana">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="type-display text-xs text-steel">ENTRA</p>
          <p className="type-num whitespace-nowrap text-base">{formatMoney(totals.in, locale)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="type-display text-xs text-steel">SAI</p>
          <p className="type-num whitespace-nowrap text-base">{formatMoney(totals.out, locale)}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="type-display text-xs text-steel">{balance.label}</p>
        <p className="type-num whitespace-nowrap text-hero font-semibold">
          {formatMoney(balance.amount, locale)}
        </p>
      </div>
    </section>
  );
}
