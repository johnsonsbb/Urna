import type { Entry, ISODate, Override, Recurring, Settings } from './types';

/**
 * Formato do arquivo de backup (seção 10) e a validação da importação.
 * Puro: monta, valida e filtra. Quem lê e escreve no banco é a camada de db.
 */

export const BACKUP_APP = 'cashflow';

export interface BackupFile {
  app: typeof BACKUP_APP;
  /** Versão do formato do arquivo, não a do IndexedDB. */
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
  recurrings: Recurring[];
  entries: Entry[];
  overrides: Override[];
}

export function backupFileName(date: ISODate): string {
  return `cashflow-backup-${date}.json`;
}

export type BackupParse =
  | { ok: true; backup: BackupFile }
  | { ok: false; reason: string };

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);
}

/**
 * Lê o texto do arquivo escolhido. Todas as recusas vêm com motivo em
 * português, porque elas aparecem na tela dos Ajustes.
 */
export function parseBackup(text: string, currentSchemaVersion: number): BackupParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'O arquivo não é um JSON válido.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'O arquivo não tem o formato de um backup.' };
  }

  const candidate = parsed as Record<string, unknown>;

  if (candidate['app'] !== BACKUP_APP) {
    return { ok: false, reason: 'Esse backup não é do CashFlow.' };
  }

  const version = candidate['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'O backup não diz de qual versão do formato ele é.' };
  }
  if (version > currentSchemaVersion) {
    return {
      ok: false,
      reason: `Esse backup é da versão ${version} do formato, e este app lê até a ${currentSchemaVersion}.`,
    };
  }

  for (const table of ['recurrings', 'entries', 'overrides'] as const) {
    if (!isRecordArray(candidate[table])) {
      return { ok: false, reason: `O backup está sem a tabela de ${table}.` };
    }
  }

  return { ok: true, backup: candidate as unknown as BackupFile };
}

/** Mesclar ignora id que já existe; substituir não usa isso. */
export function onlyNewIds<T extends { id: string }>(incoming: T[], existing: Set<string>): T[] {
  return incoming.filter((item) => !existing.has(item.id));
}

/** Dias desde o último backup. `undefined` quando nunca houve um. */
export function daysSinceBackup(lastBackupAt: string | undefined, now: Date): number | undefined {
  if (!lastBackupAt) return undefined;
  const then = new Date(lastBackupAt).getTime();
  if (Number.isNaN(then)) return undefined;
  return Math.floor((now.getTime() - then) / 86_400_000);
}
