import { overrideId } from '../core/recurrence';
import type { ISODate, Override } from '../core/types';
import { db } from './db';

/**
 * Escritas na tabela de exceções. Override que voltou a ser igual ao padrão é
 * apagado em vez de guardado vazio: o banco só tem o que quebra a regra.
 */

function isNoop(override: Override): boolean {
  return (
    override.paidEarly !== true && override.skipped !== true && override.amountOverride === undefined
  );
}

async function patchOverride(
  recurringId: string,
  date: ISODate,
  patch: Partial<Override>,
): Promise<void> {
  const id = overrideId(recurringId, date);

  await db.transaction('rw', db.overrides, async () => {
    const current = await db.overrides.get(id);
    const next: Override = { ...current, id, recurringId, date, ...patch };

    if (isNoop(next)) await db.overrides.delete(id);
    else await db.overrides.put(next);
  });
}

/** Check de pagamento antecipado. Desmarcar limpa o carimbo junto. */
export async function setPaidEarly(
  recurringId: string,
  date: ISODate,
  paid: boolean,
): Promise<void> {
  await patchOverride(recurringId, date, {
    paidEarly: paid ? true : undefined,
    paidAt: paid ? new Date().toISOString() : undefined,
  });
}

/** Valor real de uma ocorrência de conta variável. `undefined` volta à estimativa. */
export async function setAmountOverride(
  recurringId: string,
  date: ISODate,
  amountInCents: number | undefined,
): Promise<void> {
  await patchOverride(recurringId, date, { amountOverride: amountInCents });
}
