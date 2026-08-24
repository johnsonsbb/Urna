import { addDays, differenceInCalendarDays, getDaysInMonth } from 'date-fns';
import type { ISODate } from './types';

/**
 * Ponte entre a string ISO 'YYYY-MM-DD' e o `Date`. É o único lugar do app,
 * junto com o módulo de recorrência, onde `Date` aparece — e sempre em horário
 * local, nunca UTC. `toISOString()` é proibido aqui: ele converte para UTC e
 * empurra a data um dia para trás em fuso negativo.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && ISO_RE.test(value);
}

function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}

/** Monta uma ISO a partir de ano, mês (1..12) e dia. */
export function makeISO(year: number, month: number, day: number): ISODate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** ISO -> Date na meia-noite local. */
export function isoToDate(iso: ISODate): Date {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  return new Date(year, month - 1, day);
}

/** Date -> ISO usando os campos locais. */
export function dateToISO(date: Date): ISODate {
  return makeISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Hoje, em horário local. */
export function todayISO(): ISODate {
  return dateToISO(new Date());
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return dateToISO(addDays(isoToDate(iso), days));
}

/** Dias corridos de `a` até `b`; positivo quando `b` é depois. */
export function daysBetweenISO(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(isoToDate(b), isoToDate(a));
}

/** Último dia do mês (1..12) — 28, 29, 30 ou 31. */
export function daysInMonth(year: number, month: number): number {
  return getDaysInMonth(new Date(year, month - 1, 1));
}

/* O formato ISO é ordenável como texto, então comparação de string basta. */

export function minISO(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}
