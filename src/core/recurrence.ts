import type { ISODate, Occurrence, OccurrenceStatus, Override, Recurring } from './types';
import {
  addDaysISO,
  daysBetweenISO,
  daysInMonth,
  isoToDate,
  makeISO,
  maxISO,
  minISO,
  todayISO,
} from './dates';

/**
 * Módulo puro (seção 6). Entra dado, sai dado: sem React, sem acesso ao banco.
 *
 * Ocorrências não são armazenadas — são calculadas a partir das regras a cada
 * consulta, e o que existe no banco são só as exceções (`overrides`).
 */

/** Chave composta do override, também usada como id no banco. */
export function overrideId(recurringId: string, date: ISODate): string {
  return `${recurringId}:${date}`;
}

function weeklyDates(dayOfWeek: number, from: ISODate, to: ISODate): ISODate[] {
  const start = isoToDate(from);
  const offset = (dayOfWeek - start.getDay() + 7) % 7;
  const dates: ISODate[] = [];
  let current = addDaysISO(from, offset);
  while (current <= to) {
    dates.push(current);
    current = addDaysISO(current, 7);
  }
  return dates;
}

/**
 * Âncora mais múltiplos de 14 dias. Não é "duas vezes por mês": o ciclo é de
 * 14 dias corridos e ignora o calendário.
 */
function fortnightlyDates(anchorDate: ISODate, from: ISODate, to: ISODate): ISODate[] {
  const offset = daysBetweenISO(anchorDate, from);
  // Antes da âncora não existe ocorrência: o ciclo começa nela.
  const cycles = Math.max(0, Math.ceil(offset / 14));
  const dates: ISODate[] = [];
  let current = addDaysISO(anchorDate, cycles * 14);
  while (current <= to) {
    if (current >= from) dates.push(current);
    current = addDaysISO(current, 14);
  }
  return dates;
}

/**
 * Dia `dayOfMonth` de cada mês. Mês que não tem esse dia usa o último dia do
 * mês — dia 31 vira 28 em fevereiro e volta a ser 31 em março, sem "andar".
 */
function monthlyDates(dayOfMonth: number, from: ISODate, to: ISODate): ISODate[] {
  const start = isoToDate(from);
  let year = start.getFullYear();
  let month = start.getMonth() + 1;
  const dates: ISODate[] = [];

  for (;;) {
    const day = Math.min(dayOfMonth, daysInMonth(year, month));
    const date = makeISO(year, month, day);
    if (date > to) break;
    if (date >= from) dates.push(date);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return dates;
}

/** `month` + `dayOfMonth`, com o mesmo clamp do mensal (29 de fevereiro). */
function yearlyDates(month: number, dayOfMonth: number, from: ISODate, to: ISODate): ISODate[] {
  const firstYear = isoToDate(from).getFullYear();
  const lastYear = isoToDate(to).getFullYear();
  const dates: ISODate[] = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    const day = Math.min(dayOfMonth, daysInMonth(year, month));
    const date = makeISO(year, month, day);
    if (date >= from && date <= to) dates.push(date);
  }
  return dates;
}

/**
 * Datas de um recorrente dentro do intervalo, já respeitando `active`,
 * `startDate` e `endDate`, mas ainda sem aplicar overrides.
 *
 * Regra incompleta (frequência sem o campo de data correspondente) devolve
 * lista vazia em vez de erro: o formulário calcula a prévia enquanto o usuário
 * ainda está preenchendo.
 */
export function occurrenceDates(recurring: Recurring, from: ISODate, to: ISODate): ISODate[] {
  if (!recurring.active) return [];
  if (from > to) return [];

  const start = maxISO(from, recurring.startDate);
  const end = recurring.endDate ? minISO(to, recurring.endDate) : to;
  if (start > end) return [];

  switch (recurring.frequency) {
    case 'weekly':
      return recurring.dayOfWeek === undefined ? [] : weeklyDates(recurring.dayOfWeek, start, end);
    case 'fortnightly':
      return recurring.anchorDate === undefined
        ? []
        : fortnightlyDates(recurring.anchorDate, start, end);
    case 'monthly':
      return recurring.dayOfMonth === undefined ? [] : monthlyDates(recurring.dayOfMonth, start, end);
    case 'yearly':
      return recurring.month === undefined || recurring.dayOfMonth === undefined
        ? []
        : yearlyDates(recurring.month, recurring.dayOfMonth, start, end);
  }
}

/**
 * Status da ocorrência (seção 6.3), nesta ordem. Hoje conta como `previsto`
 * até virar a meia-noite, e não existe estado "atrasado".
 */
function deriveStatus(date: ISODate, today: ISODate, override?: Override): OccurrenceStatus {
  if (override?.paidEarly === true) return 'pago-antecipado';
  if (date < today) return 'pago';
  return 'previsto';
}

/**
 * Todas as ocorrências no intervalo [from, to], inclusivo nas duas pontas, já
 * com override aplicado e ordenadas por data.
 *
 * `today` é injetável só para o teste conseguir fixar o dia; em produção sai do
 * relógio local.
 */
export function expandOccurrences(
  recurrings: Recurring[],
  overrides: Override[],
  from: ISODate,
  to: ISODate,
  today: ISODate = todayISO(),
): Occurrence[] {
  if (from > to) return [];

  const byKey = new Map<string, Override>();
  for (const override of overrides) {
    byKey.set(overrideId(override.recurringId, override.date), override);
  }

  const occurrences: Occurrence[] = [];

  for (const recurring of recurrings) {
    for (const date of occurrenceDates(recurring, from, to)) {
      const override = byKey.get(overrideId(recurring.id, date));
      if (override?.skipped === true) continue;

      const realAmount = override?.amountOverride;
      const hasRealAmount = realAmount !== undefined;

      occurrences.push({
        recurringId: recurring.id,
        name: recurring.name,
        flow: recurring.flow,
        amount: hasRealAmount ? realAmount : recurring.amount,
        isEstimate: recurring.isVariable && !hasRealAmount,
        date,
        categoryId: recurring.categoryId,
        status: deriveStatus(date, today, override),
      });
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'pt-BR'));
  return occurrences;
}
