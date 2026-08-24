import { useState } from 'react';
import { categoryLabel } from '../core/categories';
import type { DayItem } from '../core/day';
import { centsToInput, formatMoney, parseAmountToCents } from '../core/money';
import type { ISODate, Locale } from '../core/types';
import { formatFullDay } from '../core/week';
import { CategoryIcon } from './CategoryIcon';

/**
 * Lista do dia selecionado. Nome trunca, valor nunca: o valor é a informação,
 * o nome é o rótulo.
 *
 * Entrada é marcada por um filete hivis na borda esquerda da linha, não pela
 * cor do número — hivis é claro demais para texto pequeno sobre concreto.
 */

/** `muted` marca o que já passou: informa que está liquidado, sem virar ação. */
function Check({ done, muted = false }: { done: boolean; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 items-center justify-center rounded-[4px] border ${
        done ? (muted ? 'border-steel bg-steel text-slab' : 'border-ink bg-ink text-slab') : 'border-hairline'
      }`}
    >
      {done && (
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 8 3.5 3.5L13 5" />
        </svg>
      )}
    </span>
  );
}

interface Props {
  date: ISODate;
  items: DayItem[];
  locale: Locale;
  /** Recorrentes de valor variável: só eles aceitam edição do valor real. */
  variableIds: Set<string>;
  onTogglePaid: (item: DayItem, paid: boolean) => void;
  onSetAmount: (item: DayItem, amountInCents: number | undefined) => void;
}

export function DayList({ date, items, locale, variableIds, onTogglePaid, onSetAmount }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  function startEditing(item: DayItem) {
    setEditing(item.key);
    setDraft(centsToInput(item.amount, locale));
  }

  function commit(item: DayItem) {
    const trimmed = draft.trim();
    onSetAmount(item, trimmed === '' ? undefined : (parseAmountToCents(trimmed) ?? undefined));
    setEditing(null);
  }

  return (
    <section className="mt-4" aria-label={`Lançamentos de ${formatFullDay(date, locale)}`}>
      <h2 className="type-display text-xs text-steel">{formatFullDay(date, locale)}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-steel">Nada nesse dia.</p>
      ) : (
        <ul className="mt-1">
          {items.map((item) => {
            const isEditable = item.kind === 'occurrence' && variableIds.has(item.sourceId);
            const isPaid = item.status === 'pago' || item.status === 'pago-antecipado';
            const canToggle = item.kind === 'occurrence' && item.status !== 'pago';

            return (
              <li
                key={item.key}
                className={`flex items-center gap-2 border-b border-hairline py-2 pl-2 ${
                  item.flow === 'in' ? 'border-l-[3px] border-l-hivis' : 'border-l-[3px] border-l-transparent'
                }`}
              >
                <span className="text-steel">
                  <CategoryIcon categoryId={item.categoryId} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.name}</p>
                  <p className="truncate text-xs text-steel">{categoryLabel(item.categoryId)}</p>
                </div>

                {editing === item.key ? (
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => commit(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commit(item);
                      if (event.key === 'Escape') setEditing(null);
                    }}
                    aria-label={`Valor real de ${item.name}`}
                    className="type-num h-11 w-24 shrink-0 rounded-btn border border-ink bg-slab px-1 text-right"
                  />
                ) : isEditable ? (
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="type-num flex h-11 shrink-0 items-center whitespace-nowrap rounded-btn px-1 underline decoration-hairline underline-offset-4 active:bg-hairline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {item.isEstimate && <span aria-hidden="true">~</span>}
                    {formatMoney(item.amount, locale)}
                    {item.isEstimate && <span className="sr-only"> (estimativa)</span>}
                  </button>
                ) : (
                  <span className="type-num shrink-0 whitespace-nowrap px-1">
                    {formatMoney(item.amount, locale)}
                  </span>
                )}

                {canToggle ? (
                  <button
                    type="button"
                    onClick={() => onTogglePaid(item, item.status !== 'pago-antecipado')}
                    aria-pressed={item.status === 'pago-antecipado'}
                    aria-label={`${item.status === 'pago-antecipado' ? 'Desmarcar' : 'Marcar'} ${item.name} como pago`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn active:bg-hairline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                  >
                    <Check done={item.status === 'pago-antecipado'} />
                  </button>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center text-steel">
                    {isPaid && <Check done muted />}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
