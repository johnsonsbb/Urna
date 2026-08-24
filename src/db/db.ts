import Dexie, { type Table } from 'dexie';
import type { Entry, Override, Recurring, Settings } from '../core/types';

/**
 * IndexedDB via Dexie (seção 5). Três tabelas de dados — recurrings, entries e
 * overrides — mais o registro único de settings, que também mora aqui para
 * entrar no backup junto com o resto.
 */

export const SCHEMA_VERSION = 1;

/** O registro de settings é único; a chave é fixa. */
export const SETTINGS_ID = 'app';

export interface StoredSettings extends Settings {
  id: string;
}

export const DEFAULT_SETTINGS: Settings = {
  weekStartsOn: 1,
  currency: 'AUD',
  locale: 'pt-BR',
  schemaVersion: SCHEMA_VERSION,
};

class CashFlowDB extends Dexie {
  recurrings!: Table<Recurring, string>;
  entries!: Table<Entry, string>;
  overrides!: Table<Override, string>;
  settings!: Table<StoredSettings, string>;

  constructor() {
    super('cashflow');

    this.version(SCHEMA_VERSION).stores({
      // Índices por data e por fluxo: toda consulta do app é "o que cai nesse
      // intervalo". `notes` e `amount` ficam fora, não se busca por eles.
      recurrings: 'id, flow, active, categoryId, frequency, startDate, endDate',
      entries: 'id, date, flow, categoryId, [date+flow]',
      overrides: 'id, recurringId, date, [recurringId+date]',
      settings: 'id',
    });
  }
}

export const db = new CashFlowDB();

/** Settings com os padrões aplicados; não grava nada se ainda não existir. */
export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get(SETTINGS_ID);
  if (!stored) return { ...DEFAULT_SETTINGS };

  const { id: _id, ...settings } = stored;
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, schemaVersion: SCHEMA_VERSION, id: SETTINGS_ID });
}
