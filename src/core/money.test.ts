import { describe, expect, it } from 'vitest';
import { formatMoney, parseAmountToCents } from './money';

describe('formatMoney', () => {
  // O pt-BR separa o símbolo com espaço não-quebrável, o que também garante
  // que o valor nunca parta em duas linhas.
  it('formata centavos como AUD', () => {
    expect(formatMoney(123_456)).toBe('$\u00a01.234,56');
    expect(formatMoney(0)).toBe('$\u00a00,00');
    expect(formatMoney(5)).toBe('$\u00a00,05');
  });

  it('valor negativo mantém o sinal', () => {
    expect(formatMoney(-45_000)).toBe('-$\u00a0450,00');
  });

  it('en-AU muda só a formatação, a moeda continua AUD', () => {
    expect(formatMoney(123_456, 'en-AU')).toBe('$1,234.56');
  });
});

describe('parseAmountToCents', () => {
  it('lê inteiro, vírgula e ponto', () => {
    expect(parseAmountToCents('12')).toBe(1200);
    expect(parseAmountToCents('12,50')).toBe(1250);
    expect(parseAmountToCents('12.50')).toBe(1250);
    expect(parseAmountToCents('12,5')).toBe(1250);
  });

  it('trata três dígitos depois do separador como milhar', () => {
    expect(parseAmountToCents('1.234')).toBe(123_400);
    expect(parseAmountToCents('1.234,56')).toBe(123_456);
  });

  it('ignora símbolo de moeda e espaço', () => {
    expect(parseAmountToCents('$\u00a01.234,56')).toBe(123_456);
  });

  it('devolve null quando não há número', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
  });

  it('devolve sempre positivo: o sinal é do flow', () => {
    expect(parseAmountToCents('-30')).toBe(3000);
  });
});
