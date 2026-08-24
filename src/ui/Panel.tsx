import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { categoryLabel } from '../core/categories';
import { buildDayItems, byCategory, panelTotals } from '../core/day';
import { todayISO } from '../core/dates';
import { formatMoney } from '../core/money';
import { periodOf, PERIOD_KINDS, type PeriodKind } from '../core/period';
import { expandOccurrences } from '../core/recurrence';
import type { Locale } from '../core/types';
import type { WeekStart } from '../core/week';
import { db } from '../db/db';
import { CategoryIcon } from './CategoryIcon';
import { Segmented } from './Controls';

/**
 * Painel (seção 7.2): alternador de período, os quatro totais e a quebra por
 * categoria em barras horizontais, do maior para o menor.
 *
 * A quebra é das saídas: é a pergunta que a tela responde. As entradas já
 * aparecem inteiras no total de cima.
 */

const PERIOD_LABELS: Record<PeriodKind, string> = {
  semana: 'SEMANA',
  quinzena: 'QUINZENA',
  mes: 'MÊS',
  ano: 'ANO',
};

function Total({ label, value, locale }: { label: string; value: number; locale: Locale }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline py-2">
      <span className="type-display text-xs text-steel">{label}</span>
      <span className="type-num whitespace-nowrap">{formatMoney(value, locale)}</span>
    </div>
  );
}

export function Panel({ locale, weekStartsOn }: { locale: Locale; weekStartsOn: WeekStart }) {
  const [kind, setKind] = useState<PeriodKind>('semana');
  const today = todayISO();
  const period = useMemo(
    () => periodOf(kind, weekStartsOn, today, locale),
    [kind, weekStartsOn, today, locale],
  );

  const data = useLiveQuery(
    async () => {
      const [recurrings, overrides, entries] = await Promise.all([
        db.recurrings.toArray(),
        db.overrides.where('date').between(period.start, period.end, true, true).toArray(),
        db.entries.where('date').between(period.start, period.end, true, true).toArray(),
      ]);
      return { recurrings, overrides, entries };
    },
    [period.start, period.end],
  );

  const items = useMemo(() => {
    if (!data) return [];
    const occurrences = expandOccurrences(data.recurrings, data.overrides, period.start, period.end);
    return buildDayItems(occurrences, data.entries);
  }, [data, period.start, period.end]);

  const totals = panelTotals(items);
  const categories = byCategory(items, 'out');
  const biggest = categories[0]?.total ?? 0;

  return (
    <div className="pb-8">
      <header className="flex items-baseline gap-2 pt-[max(8px,env(safe-area-inset-top))] pb-2">
        <h1 className="type-display text-lead font-semibold">Painel</h1>
        <p className="min-w-0 flex-1 truncate text-right text-sm text-steel">{period.label}</p>
      </header>

      <Segmented
        label="Período"
        value={kind}
        onChange={setKind}
        options={PERIOD_KINDS.map((value) => ({ value, label: PERIOD_LABELS[value] }))}
      />

      <section className="mt-4" aria-label="Totais do período">
        <Total label="ENTRADAS" value={totals.entradas} locale={locale} />
        <Total label="SAÍDAS RECORRENTES" value={totals.saidasRecorrentes} locale={locale} />
        <Total label="SAÍDAS AVULSAS" value={totals.saidasAvulsas} locale={locale} />

        <div className="mt-3">
          <p className="type-display text-xs text-steel">SOBRA</p>
          <p className="type-num whitespace-nowrap text-title font-semibold">
            {formatMoney(totals.sobra, locale)}
          </p>
        </div>
      </section>

      <section className="mt-6" aria-label="Saídas por categoria">
        <h2 className="type-display text-xs text-steel">SAÍDAS POR CATEGORIA</h2>

        {categories.length === 0 ? (
          <p className="mt-3 text-sm text-steel">Nada nesse período.</p>
        ) : (
          <ul>
            {categories.map((category) => (
              <li key={category.categoryId} className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-steel">
                    <CategoryIcon categoryId={category.categoryId} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {categoryLabel(category.categoryId)}
                  </span>
                  <span className="type-num shrink-0 whitespace-nowrap text-sm">
                    {formatMoney(category.total, locale)}
                  </span>
                </div>
                <div
                  className="mt-1 h-2 bg-ink"
                  style={{ width: `${Math.max(1, (category.total / biggest) * 100)}%` }}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
