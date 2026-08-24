import { describe, expect, it } from 'vitest';
import { buildDayItems, itemsOn, peaks, sumTotals, totalsByDay } from './day';
import type { Entry, Occurrence } from './types';

function occ(partial: Partial<Occurrence> = {}): Occurrence {
  return {
    recurringId: 'r1',
    name: 'Aluguel',
    flow: 'out',
    amount: 50_000,
    isEstimate: false,
    date: '2026-08-24',
    categoryId: 'moradia',
    status: 'previsto',
    ...partial,
  };
}

function entry(partial: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    name: 'Café',
    flow: 'out',
    amount: 750,
    date: '2026-08-24',
    categoryId: 'outros',
    createdAt: '2026-08-24T09:00:00.000Z',
    ...partial,
  };
}

describe('buildDayItems', () => {
  it('junta ocorrências e avulsos numa lista só, ordenada por data e nome', () => {
    const items = buildDayItems(
      [occ({ name: 'Zebra', date: '2026-08-25' }), occ({ name: 'Aluguel', date: '2026-08-25' })],
      [entry({ name: 'Café', date: '2026-08-24' })],
    );

    expect(items.map((i) => [i.date, i.name])).toEqual([
      ['2026-08-24', 'Café'],
      ['2026-08-25', 'Aluguel'],
      ['2026-08-25', 'Zebra'],
    ]);
  });

  it('avulso não tem status e ocorrência carrega o dela', () => {
    const [avulso, ocorrencia] = buildDayItems([occ({ name: 'Zeta' })], [entry({ name: 'Alfa' })]);

    expect(avulso?.kind).toBe('entry');
    expect(avulso?.status).toBeUndefined();
    expect(ocorrencia?.kind).toBe('occurrence');
    expect(ocorrencia?.status).toBe('previsto');
  });

  it('a chave distingue avulso de ocorrência com o mesmo id', () => {
    const items = buildDayItems([occ({ recurringId: 'x' })], [entry({ id: 'x' })]);

    expect(new Set(items.map((i) => i.key)).size).toBe(2);
  });
});

describe('totais', () => {
  const items = buildDayItems(
    [
      occ({ name: 'Aluguel', amount: 50_000, date: '2026-08-24' }),
      occ({ name: 'Salário', flow: 'in', amount: 250_000, date: '2026-08-26' }),
      occ({ name: 'Netflix', amount: 2_000, date: '2026-08-26' }),
    ],
    [entry({ amount: 750, date: '2026-08-24' })],
  );

  it('soma entra, sai e sobra da lista inteira', () => {
    expect(sumTotals(items)).toEqual({ in: 250_000, out: 52_750, left: 197_250 });
  });

  it('sobra negativa continua sendo só um número', () => {
    expect(sumTotals(buildDayItems([occ({ amount: 30_000 })], [])).left).toBe(-30_000);
  });

  it('agrupa por dia', () => {
    const byDay = totalsByDay(items);

    expect(byDay.get('2026-08-24')).toEqual({ in: 0, out: 50_750, left: -50_750 });
    expect(byDay.get('2026-08-26')).toEqual({ in: 250_000, out: 2_000, left: 248_000 });
    expect(byDay.get('2026-08-25')).toBeUndefined();
  });

  it('os picos da semana saem separados por fluxo', () => {
    expect(peaks(totalsByDay(items))).toEqual({ out: 50_750, in: 250_000 });
  });

  it('semana vazia tem pico zero', () => {
    expect(peaks(totalsByDay([]))).toEqual({ out: 0, in: 0 });
  });
});

describe('itemsOn', () => {
  it('filtra o dia pedido', () => {
    const items = buildDayItems([occ({ date: '2026-08-24' }), occ({ date: '2026-08-25' })], []);

    expect(itemsOn(items, '2026-08-25')).toHaveLength(1);
    expect(itemsOn(items, '2026-08-31')).toEqual([]);
  });
});
