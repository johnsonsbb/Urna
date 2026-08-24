/**
 * Modelo de dados (seção 5 do escopo).
 *
 * Duas regras que valem para todo o arquivo:
 * - dinheiro é inteiro em centavos, nunca float;
 * - data de calendário é string ISO 'YYYY-MM-DD', sem timezone.
 */

/** Data de calendário, sempre 'YYYY-MM-DD'. */
export type ISODate = string;

/** Datetime ISO completo, usado só para carimbo de registro (createdAt, paidAt). */
export type ISODateTime = string;

export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

/** Saída ou entrada. */
export type Flow = 'out' | 'in';

export interface Recurring {
  id: string;
  name: string;
  flow: Flow;
  /** Centavos. Quando isVariable, é só estimativa. */
  amount: number;
  isVariable: boolean;
  categoryId: string;
  frequency: Frequency;

  /** Regra de data, preenchida conforme a frequency: */
  dayOfWeek?: number; // 0=domingo..6=sábado  -> weekly
  anchorDate?: ISODate; // primeira ocorrência -> fortnightly
  dayOfMonth?: number; // 1..31                -> monthly, yearly
  month?: number; // 1..12                     -> yearly

  startDate: ISODate;
  /** Opcional. Usado para parcelamentos. */
  endDate?: ISODate;
  /** Pausar sem apagar. */
  active: boolean;
  notes?: string;
  createdAt: ISODateTime;
}

export interface Entry {
  id: string;
  name: string;
  flow: Flow;
  /** Centavos. */
  amount: number;
  date: ISODate;
  categoryId: string;
  notes?: string;
  createdAt: ISODateTime;
}

/**
 * Exceção de uma ocorrência. Ocorrências não são armazenadas: só se grava algo
 * quando o comportamento padrão da regra é quebrado.
 */
export interface Override {
  /** Chave composta: `${recurringId}:${date}`. */
  id: string;
  recurringId: string;
  /** ISO da ocorrência original. */
  date: ISODate;
  paidEarly?: boolean;
  paidAt?: ISODateTime;
  skipped?: boolean;
  /** Valor real dessa ocorrência, em centavos (contas variáveis). */
  amountOverride?: number;
}

export type Locale = 'pt-BR' | 'en-AU';

export interface Settings {
  /** 0=domingo, 1=segunda. Padrão 1. */
  weekStartsOn: 0 | 1;
  currency: 'AUD';
  /** Muda só a formatação de número e data. A interface é sempre em português. */
  locale: Locale;
  schemaVersion: number;
}

export type OccurrenceStatus = 'previsto' | 'pago-antecipado' | 'pago';

export interface Occurrence {
  recurringId: string;
  name: string;
  flow: Flow;
  /** Centavos, já com amountOverride aplicado se existir. */
  amount: number;
  /** true se a conta é variável e essa ocorrência ainda não tem valor real. */
  isEstimate: boolean;
  date: ISODate;
  categoryId: string;
  status: OccurrenceStatus;
}
