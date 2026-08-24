import type { Entry, Flow, ISODate, Occurrence, OccurrenceStatus } from './types';

/**
 * Junta o que é calculado (ocorrências de recorrentes) com o que foi registrado
 * à mão (lançamentos avulsos) numa lista só, que é o que a tela do dia mostra.
 * Puro, sem React e sem banco.
 */

export interface DayItem {
  /** Estável entre renders: serve de key no React. */
  key: string;
  kind: 'occurrence' | 'entry';
  /** recurringId quando é ocorrência, entryId quando é avulso. */
  sourceId: string;
  date: ISODate;
  name: string;
  flow: Flow;
  amount: number;
  categoryId: string;
  isEstimate: boolean;
  /** Só ocorrência tem status; avulso é fato consumado. */
  status?: OccurrenceStatus;
}

export interface Totals {
  in: number;
  out: number;
  /** entra menos sai. Pode ser negativo. */
  left: number;
}

export function buildDayItems(occurrences: Occurrence[], entries: Entry[]): DayItem[] {
  const items: DayItem[] = [];

  for (const o of occurrences) {
    items.push({
      key: `o:${o.recurringId}:${o.date}`,
      kind: 'occurrence',
      sourceId: o.recurringId,
      date: o.date,
      name: o.name,
      flow: o.flow,
      amount: o.amount,
      categoryId: o.categoryId,
      isEstimate: o.isEstimate,
      status: o.status,
    });
  }

  for (const e of entries) {
    items.push({
      key: `e:${e.id}`,
      kind: 'entry',
      sourceId: e.id,
      date: e.date,
      name: e.name,
      flow: e.flow,
      amount: e.amount,
      categoryId: e.categoryId,
      isEstimate: false,
    });
  }

  items.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'pt-BR'));
  return items;
}

export function itemsOn(items: DayItem[], date: ISODate): DayItem[] {
  return items.filter((item) => item.date === date);
}

/** Totais por dia, para a régua saber a altura de cada barra. */
export function totalsByDay(items: DayItem[]): Map<ISODate, Totals> {
  const byDay = new Map<ISODate, Totals>();

  for (const item of items) {
    let totals = byDay.get(item.date);
    if (!totals) {
      totals = { in: 0, out: 0, left: 0 };
      byDay.set(item.date, totals);
    }
    if (item.flow === 'in') totals.in += item.amount;
    else totals.out += item.amount;
    totals.left = totals.in - totals.out;
  }

  return byDay;
}

export function sumTotals(items: DayItem[]): Totals {
  let inTotal = 0;
  let outTotal = 0;

  for (const item of items) {
    if (item.flow === 'in') inTotal += item.amount;
    else outTotal += item.amount;
  }

  return { in: inTotal, out: outTotal, left: inTotal - outTotal };
}

/** Maior saída e maior entrada de um dia na semana — a régua normaliza por eles. */
export function peaks(byDay: Map<ISODate, Totals>): { out: number; in: number } {
  let out = 0;
  let inPeak = 0;

  for (const totals of byDay.values()) {
    if (totals.out > out) out = totals.out;
    if (totals.in > inPeak) inPeak = totals.in;
  }

  return { out, in: inPeak };
}
