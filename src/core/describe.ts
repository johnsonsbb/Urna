import { formatDayMonth } from './week';
import type { Locale, Recurring } from './types';

/**
 * A regra do recorrente em linguagem natural, para a lista: "toda quinta",
 * "dia 15 de cada mês", "a cada 14 dias desde 3 ago".
 *
 * O texto é sempre em português — o `locale` decide só o formato da data,
 * como no resto do app.
 */

const WEEKDAYS = [
  { article: 'todo', name: 'domingo' },
  { article: 'toda', name: 'segunda' },
  { article: 'toda', name: 'terça' },
  { article: 'toda', name: 'quarta' },
  { article: 'toda', name: 'quinta' },
  { article: 'toda', name: 'sexta' },
  { article: 'todo', name: 'sábado' },
] as const;

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

export function describeRule(recurring: Recurring, locale: Locale = 'pt-BR'): string {
  switch (recurring.frequency) {
    case 'weekly': {
      const weekday = recurring.dayOfWeek === undefined ? undefined : WEEKDAYS[recurring.dayOfWeek];
      return weekday ? `${weekday.article} ${weekday.name}` : 'toda semana';
    }
    case 'fortnightly':
      return recurring.anchorDate
        ? `a cada 14 dias desde ${formatDayMonth(recurring.anchorDate, locale)}`
        : 'a cada 14 dias';
    case 'monthly':
      return recurring.dayOfMonth === undefined
        ? 'todo mês'
        : `dia ${recurring.dayOfMonth} de cada mês`;
    case 'yearly': {
      const month = recurring.month === undefined ? undefined : MONTHS[recurring.month - 1];
      return month && recurring.dayOfMonth !== undefined
        ? `dia ${recurring.dayOfMonth} de ${month}, todo ano`
        : 'todo ano';
    }
  }
}
