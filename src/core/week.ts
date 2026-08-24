import { startOfWeek } from 'date-fns';
import { addDaysISO, dateToISO, isoToDate } from './dates';
import type { ISODate, Locale } from './types';

/**
 * A semana é a unidade principal do app. Módulo puro, como o de recorrência:
 * entra ISO, sai ISO, e `Date` não escapa daqui.
 */

export type WeekStart = 0 | 1;

export interface Week {
  start: ISODate;
  end: ISODate;
  /** Os sete dias, do início da semana ao fim. */
  days: ISODate[];
}

export function weekOf(iso: ISODate, weekStartsOn: WeekStart): Week {
  const start = dateToISO(startOfWeek(isoToDate(iso), { weekStartsOn }));
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));

  return { start, end: addDaysISO(start, 6), days };
}

/** Mesma semana deslocada de `delta` semanas; negativo volta no tempo. */
export function shiftWeek(iso: ISODate, delta: number): ISODate {
  return addDaysISO(iso, delta * 7);
}

export function isSameWeek(a: ISODate, b: ISODate, weekStartsOn: WeekStart): boolean {
  return weekOf(a, weekStartsOn).start === weekOf(b, weekStartsOn).start;
}

const dayMonthCache = new Map<Locale, Intl.DateTimeFormat>();
const weekdayCache = new Map<Locale, Intl.DateTimeFormat>();

/** "25 ago" — sem o "de" que o pt-BR insere por padrão, e sem o ponto final. */
export function formatDayMonth(iso: ISODate, locale: Locale = 'pt-BR'): string {
  let fmt = dayMonthCache.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    dayMonthCache.set(locale, fmt);
  }

  const parts = fmt.formatToParts(isoToDate(iso));
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = (parts.find((p) => p.type === 'month')?.value ?? '').replace(/\.$/, '');

  return `${day} ${month}`;
}

/** "25 ago a 31 ago". */
export function formatWeekRange(week: Week, locale: Locale = 'pt-BR'): string {
  return `${formatDayMonth(week.start, locale)} a ${formatDayMonth(week.end, locale)}`;
}

/**
 * Rótulo do dia da semana em caixa alta: SEG, TER, QUA. Três letras em
 * qualquer largura — em português as iniciais repetem (S, T, Q, Q, S, S, D) e
 * uma letra só deixaria de informar.
 */
export function weekdayLabel(iso: ISODate, locale: Locale = 'pt-BR'): string {
  let fmt = weekdayCache.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    weekdayCache.set(locale, fmt);
  }

  return fmt.format(isoToDate(iso)).replace(/\.$/, '').toUpperCase();
}

/** Número do dia, sem zero à esquerda. */
export function dayNumber(iso: ISODate): string {
  return String(Number(iso.slice(8, 10)));
}

/** "QUINTA-FEIRA, 27 AGO" — legenda da lista do dia. */
export function formatFullDay(iso: ISODate, locale: Locale = 'pt-BR'): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(isoToDate(iso));
  return `${weekday}, ${formatDayMonth(iso, locale)}`.toUpperCase();
}
