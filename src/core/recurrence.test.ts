import { describe, expect, it } from 'vitest';
import { expandOccurrences, nextOccurrences, occurrenceDates } from './recurrence';
import type { Override, Recurring } from './types';

/** Recorrente mínimo; cada teste sobrescreve só o que interessa. */
function rec(partial: Partial<Recurring> = {}): Recurring {
  return {
    id: 'r1',
    name: 'Conta',
    flow: 'out',
    amount: 10_000,
    isVariable: false,
    categoryId: 'contas',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: '2000-01-01',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function ov(partial: Partial<Override> & { recurringId: string; date: string }): Override {
  return { id: `${partial.recurringId}:${partial.date}`, ...partial };
}

const FAR_FUTURE = '2999-01-01';

describe('mensal com clamp de fim de mês', () => {
  it('dia 31 atravessando fevereiro, abril e março', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 31 });

    expect(occurrenceDates(r, '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]);
  });

  it('volta para o dia 31 depois de encolher em fevereiro', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 31 });
    const dates = occurrenceDates(r, '2026-02-01', '2026-03-31');

    expect(dates).toEqual(['2026-02-28', '2026-03-31']);
  });

  it('dia 29 em ano bissexto cai no dia 29', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 29 });

    expect(occurrenceDates(r, '2024-02-01', '2024-02-29')).toEqual(['2024-02-29']);
  });

  it('dia 29 em ano não bissexto cai no dia 28', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 29 });

    expect(occurrenceDates(r, '2026-02-01', '2026-02-28')).toEqual(['2026-02-28']);
  });

  it('anual usa o mesmo clamp: 29 de fevereiro em ano comum vira 28', () => {
    const r = rec({ frequency: 'yearly', month: 2, dayOfMonth: 29 });

    expect(occurrenceDates(r, '2024-01-01', '2027-12-31')).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
    ]);
  });
});

describe('quinzenal', () => {
  it('atravessa a virada de mês e a de ano mantendo o ciclo de 14 dias', () => {
    const r = rec({ frequency: 'fortnightly', anchorDate: '2025-12-19' });

    expect(occurrenceDates(r, '2025-12-01', '2026-02-01')).toEqual([
      '2025-12-19',
      '2026-01-02',
      '2026-01-16',
      '2026-01-30',
    ]);
  });

  it('não gera nada antes da âncora', () => {
    const r = rec({ frequency: 'fortnightly', anchorDate: '2026-03-10' });

    expect(occurrenceDates(r, '2026-01-01', '2026-03-09')).toEqual([]);
    expect(occurrenceDates(r, '2026-01-01', '2026-03-24')).toEqual(['2026-03-10', '2026-03-24']);
  });

  it('pega o ciclo certo quando o intervalo começa muito depois da âncora', () => {
    const r = rec({ frequency: 'fortnightly', anchorDate: '2026-01-02' });

    // 2026-01-02 + 14*12 = 2026-06-19, + 14*13 = 2026-07-03
    expect(occurrenceDates(r, '2026-06-19', '2026-07-05')).toEqual(['2026-06-19', '2026-07-03']);
    // e a ponta de baixo é exclusiva do que vem antes dela
    expect(occurrenceDates(r, '2026-06-20', '2026-07-05')).toEqual(['2026-07-03']);
  });
});

describe('semanal', () => {
  it('gera toda ocorrência do dia da semana dentro do intervalo', () => {
    const r = rec({ frequency: 'weekly', dayOfWeek: 4 }); // quinta

    expect(occurrenceDates(r, '2026-08-24', '2026-09-14')).toEqual([
      '2026-08-27',
      '2026-09-03',
      '2026-09-10',
    ]);
  });

  it('inclui o próprio dia quando o intervalo começa no dia da semana', () => {
    const r = rec({ frequency: 'weekly', dayOfWeek: 1 }); // segunda

    expect(occurrenceDates(r, '2026-08-24', '2026-08-24')).toEqual(['2026-08-24']);
  });
});

describe('janela de vigência', () => {
  it('endDate no meio do intervalo corta as ocorrências seguintes', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 15, endDate: '2026-04-20' });

    expect(occurrenceDates(r, '2026-01-01', '2026-12-31')).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
  });

  it('endDate exatamente na data da ocorrência ainda inclui ela', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 15, endDate: '2026-02-15' });

    expect(occurrenceDates(r, '2026-01-01', '2026-12-31')).toEqual(['2026-01-15', '2026-02-15']);
  });

  it('startDate no meio do intervalo esconde as ocorrências anteriores', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 10, startDate: '2026-03-01' });

    expect(occurrenceDates(r, '2026-01-01', '2026-04-30')).toEqual(['2026-03-10', '2026-04-10']);
  });

  it('recorrente pausado não gera ocorrência nenhuma no intervalo', () => {
    const r = rec({ frequency: 'weekly', dayOfWeek: 3, active: false });

    expect(occurrenceDates(r, '2026-08-01', '2026-08-31')).toEqual([]);
    expect(expandOccurrences([r], [], '2026-08-01', '2026-08-31', '2026-08-24')).toEqual([]);
  });
});

describe('intervalo degenerado', () => {
  it('intervalo que começa e termina no mesmo dia devolve o que cai nesse dia', () => {
    const mensal = rec({ id: 'r1', name: 'Aluguel', frequency: 'monthly', dayOfMonth: 24 });
    const outro = rec({ id: 'r2', name: 'Netflix', frequency: 'monthly', dayOfMonth: 25 });

    const found = expandOccurrences([mensal, outro], [], '2026-08-24', '2026-08-24', '2026-08-24');

    expect(found).toHaveLength(1);
    expect(found[0]?.name).toBe('Aluguel');
    expect(found[0]?.date).toBe('2026-08-24');
  });

  it('intervalo invertido devolve lista vazia', () => {
    const r = rec({ frequency: 'weekly', dayOfWeek: 1 });

    expect(expandOccurrences([r], [], '2026-08-31', '2026-08-24')).toEqual([]);
    expect(occurrenceDates(r, '2026-08-31', '2026-08-24')).toEqual([]);
  });
});

describe('overrides', () => {
  it('skip e valor ao mesmo tempo: a ocorrência simplesmente não existe', () => {
    const r = rec({ id: 'r1', frequency: 'monthly', dayOfMonth: 10, amount: 20_000 });
    const overrides = [
      ov({ recurringId: 'r1', date: '2026-02-10', skipped: true, amountOverride: 35_000 }),
    ];

    const found = expandOccurrences(
      [r],
      overrides,
      '2026-01-01',
      '2026-03-31',
      '2026-01-01',
    );

    expect(found.map((o) => o.date)).toEqual(['2026-01-10', '2026-03-10']);
  });

  it('amountOverride substitui o valor e tira a marca de estimativa', () => {
    const r = rec({ id: 'r1', frequency: 'monthly', dayOfMonth: 10, amount: 20_000, isVariable: true });
    const overrides = [ov({ recurringId: 'r1', date: '2026-01-10', amountOverride: 27_450 })];

    const [comValor, semValor] = expandOccurrences(
      [r],
      overrides,
      '2026-01-01',
      '2026-02-28',
      '2026-01-01',
    );

    expect(comValor?.amount).toBe(27_450);
    expect(comValor?.isEstimate).toBe(false);
    expect(semValor?.amount).toBe(20_000);
    expect(semValor?.isEstimate).toBe(true);
  });

  it('override de um recorrente não vaza para outro na mesma data', () => {
    const a = rec({ id: 'r1', name: 'A', frequency: 'monthly', dayOfMonth: 10 });
    const b = rec({ id: 'r2', name: 'B', frequency: 'monthly', dayOfMonth: 10 });
    const overrides = [ov({ recurringId: 'r1', date: '2026-01-10', skipped: true })];

    const found = expandOccurrences([a, b], overrides, '2026-01-01', '2026-01-31', '2026-01-01');

    expect(found.map((o) => o.name)).toEqual(['B']);
  });
});

describe('status', () => {
  const r = rec({ id: 'r1', frequency: 'monthly', dayOfMonth: 10 });

  it('data passada é pago, hoje é previsto, futuro é previsto', () => {
    const found = expandOccurrences([r], [], '2026-01-01', '2026-03-31', '2026-02-10');

    expect(found.map((o) => [o.date, o.status])).toEqual([
      ['2026-01-10', 'pago'],
      ['2026-02-10', 'previsto'],
      ['2026-03-10', 'previsto'],
    ]);
  });

  it('paidEarly ganha de tudo, inclusive numa data futura', () => {
    const overrides = [
      ov({ recurringId: 'r1', date: '2026-03-10', paidEarly: true, paidAt: '2026-02-11T09:00:00.000Z' }),
    ];

    const found = expandOccurrences([r], overrides, '2026-03-01', '2026-03-31', '2026-02-10');

    expect(found[0]?.status).toBe('pago-antecipado');
  });

  it('paidEarly numa data já passada continua pago-antecipado', () => {
    const overrides = [ov({ recurringId: 'r1', date: '2026-01-10', paidEarly: true })];

    const found = expandOccurrences([r], overrides, '2026-01-01', '2026-01-31', '2026-02-10');

    expect(found[0]?.status).toBe('pago-antecipado');
  });
});

describe('saída de expandOccurrences', () => {
  it('ordena por data e, no mesmo dia, por nome', () => {
    const zebra = rec({ id: 'r1', name: 'Zebra', frequency: 'monthly', dayOfMonth: 5 });
    const agua = rec({ id: 'r2', name: 'Água', frequency: 'monthly', dayOfMonth: 5 });
    const luz = rec({ id: 'r3', name: 'Luz', frequency: 'monthly', dayOfMonth: 3 });

    const found = expandOccurrences([zebra, agua, luz], [], '2026-01-01', '2026-01-31', '2026-01-01');

    expect(found.map((o) => o.name)).toEqual(['Luz', 'Água', 'Zebra']);
  });

  it('carrega nome, fluxo, categoria e valor do recorrente', () => {
    const salario = rec({
      id: 'r9',
      name: 'Salário',
      flow: 'in',
      amount: 250_000,
      categoryId: 'salario',
      frequency: 'fortnightly',
      anchorDate: '2026-08-06',
    });

    const found = expandOccurrences([salario], [], '2026-08-01', '2026-08-31', '2026-08-24');

    expect(found).toEqual([
      {
        recurringId: 'r9',
        name: 'Salário',
        flow: 'in',
        amount: 250_000,
        isEstimate: false,
        date: '2026-08-06',
        categoryId: 'salario',
        status: 'pago',
      },
      {
        recurringId: 'r9',
        name: 'Salário',
        flow: 'in',
        amount: 250_000,
        isEstimate: false,
        date: '2026-08-20',
        categoryId: 'salario',
        status: 'pago',
      },
    ]);
  });

  it('regra incompleta não quebra: devolve lista vazia', () => {
    const semDia = rec({ frequency: 'monthly', dayOfMonth: undefined });
    const semAncora = rec({ frequency: 'fortnightly', anchorDate: undefined, dayOfMonth: undefined });

    expect(occurrenceDates(semDia, '2026-01-01', FAR_FUTURE)).toEqual([]);
    expect(occurrenceDates(semAncora, '2026-01-01', '2026-12-31')).toEqual([]);
  });
});

describe('nextOccurrences', () => {
  it('devolve as próximas três de um quinzenal', () => {
    const r = rec({ frequency: 'fortnightly', anchorDate: '2026-08-28' });

    expect(nextOccurrences(r, 3, '2026-08-24')).toEqual(['2026-08-28', '2026-09-11', '2026-09-25']);
  });

  it('inclui o próprio dia quando a ocorrência é hoje', () => {
    const r = rec({ frequency: 'weekly', dayOfWeek: 1 });

    expect(nextOccurrences(r, 2, '2026-08-24')).toEqual(['2026-08-24', '2026-08-31']);
  });

  it('atravessa meses e anos no mensal com clamp', () => {
    const r = rec({ frequency: 'monthly', dayOfMonth: 31 });

    expect(nextOccurrences(r, 4, '2025-12-01')).toEqual([
      '2025-12-31',
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('devolve menos que o pedido quando o endDate corta antes', () => {
    const r = rec({ frequency: 'weekly', dayOfWeek: 1, endDate: '2026-09-01' });

    expect(nextOccurrences(r, 3, '2026-08-24')).toEqual(['2026-08-24', '2026-08-31']);
  });

  it('anual olha longe o bastante', () => {
    const r = rec({ frequency: 'yearly', month: 3, dayOfMonth: 15 });

    expect(nextOccurrences(r, 3, '2026-08-24')).toEqual(['2027-03-15', '2028-03-15', '2029-03-15']);
  });

  it('lista vazia para contagem zero ou regra incompleta', () => {
    expect(nextOccurrences(rec({ frequency: 'weekly', dayOfWeek: 1 }), 0)).toEqual([]);
    expect(nextOccurrences(rec({ frequency: 'weekly', dayOfWeek: undefined }), 3)).toEqual([]);
  });
});
