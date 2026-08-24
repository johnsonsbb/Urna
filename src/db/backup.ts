import { BACKUP_APP, onlyNewIds, type BackupFile } from '../core/backup';
import type { Entry, Override, Recurring } from '../core/types';
import { BACKUP_SCHEMA_VERSION, db, getSettings, saveSettings, SETTINGS_ID } from './db';

/**
 * Exportar e importar (seção 10). O backup é parte do produto: o IndexedDB do
 * Safari não tem garantia de durabilidade, e limpar o histórico derruba tudo.
 */

export async function exportBackup(): Promise<BackupFile> {
  const [settings, recurrings, entries, overrides] = await Promise.all([
    getSettings(),
    db.recurrings.toArray(),
    db.entries.toArray(),
    db.overrides.toArray(),
  ]);

  const { lastBackupAt: _lastBackupAt, ...preferences } = settings;

  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: preferences,
    recurrings,
    entries,
    overrides,
  };
}

export type ImportMode = 'substituir' | 'mesclar';

export interface ImportResult {
  recurrings: number;
  entries: number;
  overrides: number;
}

/**
 * Substituir troca tudo, inclusive as preferências. Mesclar só acrescenta o
 * que tem id novo e deixa as preferências atuais em paz — quem mescla está
 * juntando dados, não voltando o aparelho para outro estado.
 */
export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<ImportResult> {
  return db.transaction('rw', db.recurrings, db.entries, db.overrides, db.settings, async () => {
    if (mode === 'substituir') {
      await Promise.all([db.recurrings.clear(), db.entries.clear(), db.overrides.clear()]);
      await Promise.all([
        db.recurrings.bulkPut(backup.recurrings),
        db.entries.bulkPut(backup.entries),
        db.overrides.bulkPut(backup.overrides),
      ]);
      await db.settings.put({ ...backup.settings, id: SETTINGS_ID });

      return {
        recurrings: backup.recurrings.length,
        entries: backup.entries.length,
        overrides: backup.overrides.length,
      };
    }

    const [recurringIds, entryIds, overrideIds] = await Promise.all([
      db.recurrings.toCollection().primaryKeys(),
      db.entries.toCollection().primaryKeys(),
      db.overrides.toCollection().primaryKeys(),
    ]);

    const recurrings = onlyNewIds<Recurring>(backup.recurrings, new Set(recurringIds));
    const entries = onlyNewIds<Entry>(backup.entries, new Set(entryIds));
    const overrides = onlyNewIds<Override>(backup.overrides, new Set(overrideIds));

    await Promise.all([
      db.recurrings.bulkAdd(recurrings),
      db.entries.bulkAdd(entries),
      db.overrides.bulkAdd(overrides),
    ]);

    return {
      recurrings: recurrings.length,
      entries: entries.length,
      overrides: overrides.length,
    };
  });
}

export async function markBackupTaken(): Promise<void> {
  await saveSettings({ lastBackupAt: new Date().toISOString() });
}

/** Apaga os lançamentos e as regras, e devolve as preferências ao padrão. */
export async function eraseEverything(): Promise<void> {
  await db.transaction('rw', db.recurrings, db.entries, db.overrides, db.settings, async () => {
    await Promise.all([
      db.recurrings.clear(),
      db.entries.clear(),
      db.overrides.clear(),
      db.settings.clear(),
    ]);
  });
}
