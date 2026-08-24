import type { Recurring } from '../core/types';
import { db } from './db';

/** Escritas na tabela de recorrentes. */

export type RecurringDraft = Omit<Recurring, 'id' | 'createdAt'> &
  Partial<Pick<Recurring, 'id' | 'createdAt'>>;

/** Cria ou atualiza. Devolve o id, que é gerado aqui quando não existe. */
export async function saveRecurring(draft: RecurringDraft): Promise<string> {
  const id = draft.id ?? crypto.randomUUID();
  const record: Recurring = {
    ...draft,
    id,
    createdAt: draft.createdAt ?? new Date().toISOString(),
  };

  await db.recurrings.put(record);
  return id;
}

/** Pausar não apaga: a regra continua no banco, só para de gerar ocorrência. */
export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  await db.recurrings.update(id, { active });
}

/**
 * Excluir leva junto os overrides da conta. Sem isso ficariam exceções órfãs
 * apontando para uma regra que não existe mais.
 */
export async function deleteRecurring(id: string): Promise<void> {
  await db.transaction('rw', db.recurrings, db.overrides, async () => {
    await db.overrides.where('recurringId').equals(id).delete();
    await db.recurrings.delete(id);
  });
}
