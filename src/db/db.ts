import Dexie, { type Table } from 'dexie';
import type { Entry, Override, Recurring, Settings } from '../core/types';

/**
 * IndexedDB via Dexie (seção 5). Três tabelas de dados — recurrings, entries e
 * overrides — mais o registro único de settings, que também mora aqui para
 * entrar no backup junto com o resto.
 */

/**
 * Versão do schema do IndexedDB. Sobe quando muda tabela ou índice, e cada
 * degrau precisa da migração correspondente no Dexie. Não tem relação com o
 * formato do arquivo de backup.
 */
export const DB_VERSION = 1;

/**
 * Versão do formato do JSON de backup (seção 10). Sobe quando muda a forma do
 * arquivo exportado, e é ela que a importação valida. É esta que vai no campo
 * `schemaVersion` de settings.
 */
export const BACKUP_SCHEMA_VERSION = 1;

/** O registro de settings é único; a chave é fixa. */
export const SETTINGS_ID = 'app';

export interface StoredSettings extends Settings {
  id: string;
  /**
   * Quando saiu o último backup. Fica só no registro guardado, fora da
   * interface `Settings` da seção 5.4, porque é estado do app e não uma
   * preferência do usuário.
   */
  lastBackupAt?: string;
}

/** Settings como o app usa: as preferências mais o carimbo do último backup. */
export type AppSettings = Settings & { lastBackupAt?: string };

export const DEFAULT_SETTINGS: Settings = {
  weekStartsOn: 1,
  currency: 'AUD',
  locale: 'pt-BR',
  schemaVersion: BACKUP_SCHEMA_VERSION,
};

class CashFlowDB extends Dexie {
  recurrings!: Table<Recurring, string>;
  entries!: Table<Entry, string>;
  overrides!: Table<Override, string>;
  settings!: Table<StoredSettings, string>;

  constructor() {
    super('cashflow');

    this.version(DB_VERSION).stores({
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
export async function getSettings(): Promise<AppSettings> {
  const stored = await db.settings.get(SETTINGS_ID);
  if (!stored) return { ...DEFAULT_SETTINGS };

  const { id: _id, ...settings } = stored;
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, schemaVersion: BACKUP_SCHEMA_VERSION, id: SETTINGS_ID });
}
