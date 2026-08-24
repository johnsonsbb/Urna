import { describe, expect, it } from 'vitest';
import { buildDayItems, byCategory, itemsOn, panelTotals, peaks, sumTotals, totalsByDay } from './day';
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
  it('junta ocorrências e avulsos numa lista só, por data e depois por valor', () => {
    const items = buildDayItems(
      [
        occ({ name: 'Netflix', amount: 2_000, date: '2026-08-25' }),
        occ({ name: 'Aluguel', amount: 128_000, date: '2026-08-25' }),
      ],
      [entry({ name: 'Café', amount: 750, date: '2026-08-24' })],
    );

    expect(items.map((i) => [i.date, i.name])).toEqual([
      ['2026-08-24', 'Café'],
      ['2026-08-25', 'Aluguel'],
      ['2026-08-25', 'Netflix'],
    ]);
  });

  it('valor decrescente vale para entrada e saída juntas', () => {
    const items = buildDayItems(
      [
        occ({ name: 'Aluguel', amount: 128_000 }),
        occ({ name: 'Salário', flow: 'in', amount: 520_000 }),
        occ({ name: 'Netflix', amount: 2_000 }),
      ],
      [entry({ name: 'Feira', amount: 23_450 })],
    );

    expect(items.map((i) => i.name)).toEqual(['Salário', 'Aluguel', 'Feira', 'Netflix']);
  });

  it('valores iguais desempatam pelo nome', () => {
    const items = buildDayItems([occ({ name: 'Zebra', amount: 500 }), occ({ name: 'Alfa', amount: 500 })], []);

    expect(items.map((i) => i.name)).toEqual(['Alfa', 'Zebra']);
  });

  it('avulso não tem status e ocorrência carrega o dela', () => {
    const [avulso, ocorrencia] = buildDayItems(
      [occ({ name: 'Zeta', amount: 100 })],
      [entry({ name: 'Alfa', amount: 900 })],
    );

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

describe('painel', () => {
  const items = buildDayItems(
    [
      occ({ name: 'Aluguel', amount: 128_000, categoryId: 'moradia' }),
      occ({ name: 'Netflix', amount: 2_299, categoryId: 'assinaturas' }),
      occ({ name: 'Salário', flow: 'in', amount: 520_000, categoryId: 'salario' }),
    ],
    [
      entry({ id: 'e1', name: 'Feira', amount: 23_450, categoryId: 'mercado' }),
      entry({ id: 'e2', name: 'Café', amount: 750, categoryId: 'outros' }),
      entry({ id: 'e3', name: 'Bico', flow: 'in', amount: 15_000, categoryId: 'extra' }),
    ],
  );

  it('separa saída recorrente de saída avulsa', () => {
    expect(panelTotals(items)).toEqual({
      entradas: 535_000,
      saidasRecorrentes: 130_299,
      saidasAvulsas: 24_200,
      sobra: 380_501,
    });
  });

  it('sobra negativa é só um número negativo', () => {
    const magros = buildDayItems([occ({ amount: 30_000 })], []);

    expect(panelTotals(magros).sobra).toBe(-30_000);
  });

  it('período vazio zera os quatro', () => {
    expect(panelTotals([])).toEqual({
      entradas: 0,
      saidasRecorrentes: 0,
      saidasAvulsas: 0,
      sobra: 0,
    });
  });

  it('quebra por categoria soma recorrente com avulso e ordena do maior', () => {
    expect(byCategory(items, 'out')).toEqual([
      { categoryId: 'moradia', total: 128_000 },
      { categoryId: 'mercado', total: 23_450 },
      { categoryId: 'assinaturas', total: 2_299 },
      { categoryId: 'outros', total: 750 },
    ]);
  });

  it('a quebra de entrada é uma lista separada', () => {
    expect(byCategory(items, 'in')).toEqual([
      { categoryId: 'salario', total: 520_000 },
      { categoryId: 'extra', total: 15_000 },
    ]);
  });

  it('duas linhas na mesma categoria viram uma barra só', () => {
    const mesmaCategoria = buildDayItems(
      [occ({ name: 'Luz', amount: 18_000, categoryId: 'contas' })],
      [entry({ name: 'Água', amount: 7_000, categoryId: 'contas' })],
    );

    expect(byCategory(mesmaCategoria, 'out')).toEqual([{ categoryId: 'contas', total: 25_000 }]);
  });
});
