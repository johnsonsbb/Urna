import { describe, expect, it } from 'vitest';
import { backupFileName, daysSinceBackup, onlyNewIds, parseBackup } from './backup';

const valid = {
  app: 'cashflow',
  schemaVersion: 1,
  exportedAt: '2026-08-24T10:00:00.000Z',
  settings: { weekStartsOn: 1, currency: 'AUD', locale: 'pt-BR', schemaVersion: 1 },
  recurrings: [],
  entries: [],
  overrides: [],
};

describe('backupFileName', () => {
  it('usa a data do dia no nome', () => {
    expect(backupFileName('2026-08-24')).toBe('cashflow-backup-2026-08-24.json');
  });
});

describe('parseBackup', () => {
  it('aceita um arquivo bem formado', () => {
    const result = parseBackup(JSON.stringify(valid), 1);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.schemaVersion).toBe(1);
  });

  it('recusa texto que não é JSON', () => {
    expect(parseBackup('isso não é json', 1)).toMatchObject({ ok: false });
  });

  it('recusa JSON que não é objeto', () => {
    expect(parseBackup('[1,2,3]', 1)).toMatchObject({ ok: false });
    expect(parseBackup('"texto"', 1)).toMatchObject({ ok: false });
  });

  it('recusa backup de outro app', () => {
    const outro = parseBackup(JSON.stringify({ ...valid, app: 'outra-coisa' }), 1);

    expect(outro).toMatchObject({ ok: false });
    if (!outro.ok) expect(outro.reason).toContain('não é do CashFlow');
  });

  it('recusa formato mais novo do que o app sabe ler', () => {
    const futuro = parseBackup(JSON.stringify({ ...valid, schemaVersion: 7 }), 1);

    expect(futuro).toMatchObject({ ok: false });
    if (!futuro.ok) expect(futuro.reason).toContain('versão 7');
  });

  it('aceita formato mais antigo', () => {
    expect(parseBackup(JSON.stringify(valid), 3).ok).toBe(true);
  });

  it('recusa schemaVersion que não é inteiro positivo', () => {
    expect(parseBackup(JSON.stringify({ ...valid, schemaVersion: '1' }), 1).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...valid, schemaVersion: 1.5 }), 1).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...valid, schemaVersion: 0 }), 1).ok).toBe(false);
  });

  it('recusa arquivo sem alguma das três tabelas', () => {
    for (const table of ['recurrings', 'entries', 'overrides']) {
      const incompleto = { ...valid, [table]: undefined };
      const result = parseBackup(JSON.stringify(incompleto), 1);

      expect(result).toMatchObject({ ok: false });
      if (!result.ok) expect(result.reason).toContain(table);
    }
  });
});

describe('onlyNewIds', () => {
  it('mesclar ignora os ids que já existem', () => {
    const incoming = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    expect(onlyNewIds(incoming, new Set(['b']))).toEqual([{ id: 'a' }, { id: 'c' }]);
  });

  it('sem nada existente, tudo entra', () => {
    expect(onlyNewIds([{ id: 'a' }], new Set())).toEqual([{ id: 'a' }]);
  });
});

describe('daysSinceBackup', () => {
  const agora = new Date('2026-08-24T12:00:00.000Z');

  it('conta os dias corridos desde o último backup', () => {
    expect(daysSinceBackup('2026-08-24T09:00:00.000Z', agora)).toBe(0);
    expect(daysSinceBackup('2026-07-20T12:00:00.000Z', agora)).toBe(35);
  });

  it('sem backup nenhum, não há contagem', () => {
    expect(daysSinceBackup(undefined, agora)).toBeUndefined();
    expect(daysSinceBackup('data quebrada', agora)).toBeUndefined();
  });
});
