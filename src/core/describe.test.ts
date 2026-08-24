import { describe, expect, it } from 'vitest';
import { describeRule } from './describe';
import type { Recurring } from './types';

function rec(partial: Partial<Recurring>): Recurring {
  return {
    id: 'r1',
    name: 'Conta',
    flow: 'out',
    amount: 1000,
    isVariable: false,
    categoryId: 'contas',
    frequency: 'monthly',
    startDate: '2026-01-01',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('describeRule', () => {
  it('semanal usa o artigo certo para cada dia', () => {
    expect(describeRule(rec({ frequency: 'weekly', dayOfWeek: 4 }))).toBe('toda quinta');
    expect(describeRule(rec({ frequency: 'weekly', dayOfWeek: 1 }))).toBe('toda segunda');
    expect(describeRule(rec({ frequency: 'weekly', dayOfWeek: 6 }))).toBe('todo sábado');
    expect(describeRule(rec({ frequency: 'weekly', dayOfWeek: 0 }))).toBe('todo domingo');
  });

  it('quinzenal conta em dias, não em meia-quinzena', () => {
    expect(describeRule(rec({ frequency: 'fortnightly', anchorDate: '2026-08-03' }))).toBe(
      'a cada 14 dias desde 3 ago',
    );
  });

  it('mensal e anual', () => {
    expect(describeRule(rec({ frequency: 'monthly', dayOfMonth: 15 }))).toBe('dia 15 de cada mês');
    expect(describeRule(rec({ frequency: 'yearly', month: 3, dayOfMonth: 15 }))).toBe(
      'dia 15 de março, todo ano',
    );
  });

  it('regra ainda incompleta não quebra a lista', () => {
    expect(describeRule(rec({ frequency: 'weekly', dayOfWeek: undefined }))).toBe('toda semana');
    expect(describeRule(rec({ frequency: 'fortnightly' }))).toBe('a cada 14 dias');
    expect(describeRule(rec({ frequency: 'monthly', dayOfMonth: undefined }))).toBe('todo mês');
    expect(describeRule(rec({ frequency: 'yearly' }))).toBe('todo ano');
  });
});
