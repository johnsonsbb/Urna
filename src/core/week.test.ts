import { describe, expect, it } from 'vitest';
import {
  dayNumber,
  formatDayMonth,
  formatWeekRange,
  isSameWeek,
  shiftWeek,
  weekdayLabel,
  weekOf,
} from './week';

describe('weekOf', () => {
  it('com início na segunda, devolve de segunda a domingo', () => {
    const week = weekOf('2026-08-27', 1); // uma quinta

    expect(week.start).toBe('2026-08-24');
    expect(week.end).toBe('2026-08-30');
    expect(week.days).toHaveLength(7);
    expect(week.days[0]).toBe('2026-08-24');
    expect(week.days[6]).toBe('2026-08-30');
  });

  it('com início no domingo, a mesma quinta cai em outra semana', () => {
    const week = weekOf('2026-08-27', 0);

    expect(week.start).toBe('2026-08-23');
    expect(week.end).toBe('2026-08-29');
  });

  it('o próprio início de semana devolve ele mesmo', () => {
    expect(weekOf('2026-08-24', 1).start).toBe('2026-08-24');
  });

  it('atravessa a virada de mês e a de ano', () => {
    expect(weekOf('2026-01-01', 1).days).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
  });
});

describe('navegação', () => {
  it('shiftWeek anda de sete em sete dias', () => {
    expect(shiftWeek('2026-08-24', 1)).toBe('2026-08-31');
    expect(shiftWeek('2026-08-24', -1)).toBe('2026-08-17');
    expect(shiftWeek('2026-01-01', -1)).toBe('2025-12-25');
  });

  it('isSameWeek respeita o início da semana', () => {
    expect(isSameWeek('2026-08-24', '2026-08-30', 1)).toBe(true);
    expect(isSameWeek('2026-08-24', '2026-08-31', 1)).toBe(false);
    // domingo 23 e segunda 24: mesma semana se ela começa no domingo
    expect(isSameWeek('2026-08-23', '2026-08-24', 0)).toBe(true);
    expect(isSameWeek('2026-08-23', '2026-08-24', 1)).toBe(false);
  });
});

describe('rótulos', () => {
  it('formata dia e mês sem o "de" e sem ponto', () => {
    expect(formatDayMonth('2026-08-25')).toBe('25 ago');
    expect(formatDayMonth('2026-01-03')).toBe('3 jan');
  });

  it('monta o intervalo da semana', () => {
    expect(formatWeekRange(weekOf('2026-08-25', 1))).toBe('24 ago a 30 ago');
  });

  it('dia da semana em caixa alta, com três letras ou uma', () => {
    expect(weekdayLabel('2026-08-24', 'short')).toBe('SEG');
    expect(weekdayLabel('2026-08-29', 'short')).toBe('SÁB');
    expect(weekdayLabel('2026-08-24', 'narrow')).toBe('S');
    expect(weekdayLabel('2026-08-25', 'narrow')).toBe('T');
  });

  it('número do dia sai sem zero à esquerda', () => {
    expect(dayNumber('2026-08-05')).toBe('5');
    expect(dayNumber('2026-08-25')).toBe('25');
  });
});
