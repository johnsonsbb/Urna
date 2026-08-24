import { describe, expect, it } from 'vitest';
import { daysBetweenISO } from './dates';
import { periodOf } from './period';

describe('periodOf', () => {
  it('semana usa o início de semana configurado', () => {
    expect(periodOf('semana', 1, '2026-08-27')).toMatchObject({
      start: '2026-08-24',
      end: '2026-08-30',
      label: '24 ago a 30 ago',
    });
    expect(periodOf('semana', 0, '2026-08-27')).toMatchObject({
      start: '2026-08-23',
      end: '2026-08-29',
    });
  });

  it('quinzena é a semana atual mais a seguinte, catorze dias corridos', () => {
    const period = periodOf('quinzena', 1, '2026-08-27');

    expect(period).toMatchObject({ start: '2026-08-24', end: '2026-09-06' });
    expect(daysBetweenISO(period.start, period.end)).toBe(13);
  });

  it('quinzena não é metade do mês: começa na semana, não no dia 1 nem no 16', () => {
    const period = periodOf('quinzena', 1, '2026-08-18');

    expect(period.start).toBe('2026-08-17');
    expect(period.end).toBe('2026-08-30');
  });

  it('quinzena atravessa a virada de ano', () => {
    expect(periodOf('quinzena', 1, '2026-12-30')).toMatchObject({
      start: '2026-12-28',
      end: '2027-01-10',
    });
  });

  it('mês vai do dia 1 ao último dia, inclusive em fevereiro', () => {
    expect(periodOf('mes', 1, '2026-02-14')).toMatchObject({
      start: '2026-02-01',
      end: '2026-02-28',
      label: 'fevereiro',
    });
    expect(periodOf('mes', 1, '2024-02-14').end).toBe('2024-02-29');
    expect(periodOf('mes', 1, '2026-08-31').end).toBe('2026-08-31');
  });

  it('ano vai de 1 de janeiro a 31 de dezembro', () => {
    expect(periodOf('ano', 1, '2026-08-24')).toMatchObject({
      start: '2026-01-01',
      end: '2026-12-31',
      label: '2026',
    });
  });
});
