import { addDaysISO, daysInMonth, isoToDate, makeISO, todayISO } from './dates';
import type { ISODate, Locale } from './types';
import { formatDayMonth, shiftWeek, weekOf, type WeekStart } from './week';

/**
 * Os quatro períodos do painel (seção 7.2). Puro, como o resto do core.
 *
 * A quinzena é a semana atual mais a seguinte — catorze dias corridos — e não
 * "metade do mês". São coisas diferentes e o app trabalha em ciclos de semana.
 */

export type PeriodKind = 'semana' | 'quinzena' | 'mes' | 'ano';

export const PERIOD_KINDS: PeriodKind[] = ['semana', 'quinzena', 'mes', 'ano'];

export interface Period {
  kind: PeriodKind;
  start: ISODate;
  end: ISODate;
  /** Como o período se chama na tela: "24 ago a 30 ago", "agosto", "2026". */
  label: string;
}

const monthNameCache = new Map<Locale, Intl.DateTimeFormat>();

function monthName(iso: ISODate, locale: Locale): string {
  let fmt = monthNameCache.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
    monthNameCache.set(locale, fmt);
  }
  return fmt.format(isoToDate(iso));
}

export function periodOf(
  kind: PeriodKind,
  weekStartsOn: WeekStart,
  reference: ISODate = todayISO(),
  locale: Locale = 'pt-BR',
): Period {
  const year = Number(reference.slice(0, 4));
  const month = Number(reference.slice(5, 7));

  switch (kind) {
    case 'semana': {
      const week = weekOf(reference, weekStartsOn);
      return {
        kind,
        start: week.start,
        end: week.end,
        label: `${formatDayMonth(week.start, locale)} a ${formatDayMonth(week.end, locale)}`,
      };
    }
    case 'quinzena': {
      const week = weekOf(reference, weekStartsOn);
      const end = addDaysISO(weekOf(shiftWeek(reference, 1), weekStartsOn).start, 6);
      return {
        kind,
        start: week.start,
        end,
        label: `${formatDayMonth(week.start, locale)} a ${formatDayMonth(end, locale)}`,
      };
    }
    case 'mes': {
      const start = makeISO(year, month, 1);
      return {
        kind,
        start,
        end: makeISO(year, month, daysInMonth(year, month)),
        label: monthName(start, locale),
      };
    }
    case 'ano':
      return {
        kind,
        start: makeISO(year, 1, 1),
        end: makeISO(year, 12, 31),
        label: String(year),
      };
  }
}
