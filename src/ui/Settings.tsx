import { useEffect, useRef, useState } from 'react';
import { backupFileName, daysSinceBackup, parseBackup, type BackupFile } from '../core/backup';
import { todayISO } from '../core/dates';
import type { Locale } from '../core/types';
import { formatDayMonthYear } from '../core/week';
import { eraseEverything, exportBackup, importBackup, markBackupTaken, type ImportMode } from '../db/backup';
import { BACKUP_SCHEMA_VERSION, saveSettings, type AppSettings } from '../db/db';
import { BUTTON, BUTTON_PRIMARY, Segmented } from './Controls';

/**
 * Ajustes (seção 7.6). Além das preferências, é aqui que mora o backup, que é
 * parte do produto e não um extra: o WebKit pode limpar o IndexedDB, e limpar
 * o histórico do Safari derruba tudo.
 */

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="type-display text-xs text-steel">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** "1 recorrente", "3 recorrentes". */
function count(quantity: number, singular: string, plural: string): string {
  return `${quantity} ${quantity === 1 ? singular : plural}`;
}

function formatBytes(bytes: number, locale: Locale): string {
  const mb = bytes / 1_048_576;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(mb)} MB`;
}

interface StorageInfo {
  persisted: boolean;
  usage?: number;
  quota?: number;
}

export function Settings({ settings }: { settings: AppSettings }) {
  const locale = settings.locale;
  const fileInput = useRef<HTMLInputElement>(null);

  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingErase, setConfirmingErase] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      const estimate = (await navigator.storage?.estimate?.()) ?? {};
      if (alive) setStorage({ persisted, usage: estimate.usage, quota: estimate.quota });
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleExport() {
    const backup = await exportBackup();
    const name = backupFileName(todayISO());
    const file = new File([JSON.stringify(backup, null, 2)], name, { type: 'application/json' });

    try {
      // No iPhone isso abre o share sheet, que é como o arquivo sai do app.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'CashFlow' });
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Share sheet cancelado: não houve backup, então não carimba.
      return;
    }

    await markBackupTaken();
    setMessage(`Backup gerado: ${name}`);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const result = parseBackup(await file.text(), BACKUP_SCHEMA_VERSION);
    if (!result.ok) {
      setPending(null);
      setMessage(result.reason);
      return;
    }

    setMessage(null);
    setPending(result.backup);
  }

  async function applyImport(mode: ImportMode) {
    if (!pending) return;
    const added = await importBackup(pending, mode);
    setPending(null);
    setMessage(
      mode === 'substituir'
        ? `Substituído por ${count(added.recurrings, 'recorrente', 'recorrentes')} e ${count(added.entries, 'lançamento', 'lançamentos')}.`
        : `Mesclado: ${count(added.recurrings, 'recorrente novo', 'recorrentes novos')} e ${count(added.entries, 'lançamento novo', 'lançamentos novos')}.`,
    );
  }

  const days = daysSinceBackup(settings.lastBackupAt, new Date());

  return (
    <div className="pb-8">
      <header className="pt-[max(8px,env(safe-area-inset-top))] pb-1">
        <h1 className="type-display text-lead font-semibold">Ajustes</h1>
      </header>

      <Block title="A SEMANA COMEÇA">
        <Segmented
          label="A semana começa"
          value={String(settings.weekStartsOn)}
          onChange={(value) => void saveSettings({ weekStartsOn: value === '0' ? 0 : 1 })}
          options={[
            { value: '1', label: 'SEGUNDA' },
            { value: '0', label: 'DOMINGO' },
          ]}
        />
      </Block>

      <Block title="IDIOMA">
        <Segmented
          label="Idioma"
          value={settings.locale}
          onChange={(value) => void saveSettings({ locale: value })}
          options={[
            { value: 'pt-BR', label: 'PT-BR' },
            { value: 'en-AU', label: 'EN-AU' },
          ]}
        />
        <p className="mt-2 text-xs text-steel">
          Muda o formato de números e datas. A interface é sempre em português e a moeda é sempre
          AUD.
        </p>
      </Block>

      <Block title="BACKUP">
        <p className="text-sm text-steel">
          {days === undefined
            ? 'Nenhum backup ainda.'
            : `Último backup: ${formatDayMonthYear(settings.lastBackupAt!.slice(0, 10), locale)}.`}
        </p>
        {days !== undefined && days > 30 && (
          <p className="mt-1 text-sm text-steel">Faz {count(days, 'dia', 'dias')}.</p>
        )}

        <div className="mt-2 flex gap-1">
          <button type="button" onClick={() => void handleExport()} className={BUTTON_PRIMARY}>
            EXPORTAR
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`${BUTTON} border border-hairline bg-slab`}
          >
            IMPORTAR
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Escolher arquivo de backup"
            onChange={(event) => void handleFile(event)}
          />
        </div>

        {pending && (
          <div className="mt-3 rounded-card bg-slab p-3">
            <p className="text-sm">
              O arquivo tem {count(pending.recurrings.length, 'recorrente', 'recorrentes')},{' '}
              {count(pending.entries.length, 'lançamento', 'lançamentos')} e{' '}
              {count(pending.overrides.length, 'exceção', 'exceções')}.
            </p>
            <p className="mt-1 text-xs text-steel">
              Substituir troca tudo o que está no aparelho. Mesclar só acrescenta o que ainda não
              existe aqui.
            </p>
            <div className="mt-2 flex flex-wrap justify-end gap-1">
              <button type="button" onClick={() => setPending(null)} className={`${BUTTON} text-steel`}>
                CANCELAR
              </button>
              {/* Substituir apaga o que está no aparelho: fica secundário e
                  longe da ponta que o dedo acerta por reflexo. */}
              <button
                type="button"
                onClick={() => void applyImport('substituir')}
                className={`${BUTTON} border border-hairline bg-slab`}
              >
                SUBSTITUIR TUDO
              </button>
              <button type="button" onClick={() => void applyImport('mesclar')} className={BUTTON_PRIMARY}>
                MESCLAR
              </button>
            </div>
          </div>
        )}

        {message && <p className="mt-2 text-sm text-steel">{message}</p>}
      </Block>

      <Block title="ARMAZENAMENTO">
        {storage === null ? (
          <p className="text-sm text-steel">Consultando…</p>
        ) : (
          <>
            <p className="text-sm text-steel">
              Modo persistente: {storage.persisted ? 'concedido' : 'não concedido'}.
            </p>
            {/* Sem type-num: não é dinheiro, e o tabular-nums abre buracos no
                meio de uma frase corrida. */}
            {storage.usage !== undefined && storage.quota !== undefined && (
              <p className="text-sm text-steel">
                {formatBytes(storage.usage, locale)} em uso de {formatBytes(storage.quota, locale)}{' '}
                disponíveis.
              </p>
            )}
          </>
        )}
      </Block>

      <Block title="APAGAR">
        {confirmingErase ? (
          <div className="rounded-card bg-slab p-3">
            <p className="text-sm">
              Apaga recorrentes, lançamentos e exceções deste aparelho, e volta as preferências ao
              padrão. O arquivo de backup já exportado não é afetado.
            </p>
            <div className="mt-2 flex justify-end gap-1">
              <button type="button" onClick={() => setConfirmingErase(false)} className={`${BUTTON} text-steel`}>
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => {
                  void eraseEverything();
                  setConfirmingErase(false);
                  setMessage('Tudo apagado.');
                }}
                className={BUTTON_PRIMARY}
              >
                APAGAR
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingErase(true)}
            className={`${BUTTON} border border-hairline bg-slab`}
          >
            APAGAR TUDO
          </button>
        )}
      </Block>
    </div>
  );
}
