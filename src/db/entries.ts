import type { Entry } from '../core/types';
import { db } from './db';

/** Escritas na tabela de lançamentos avulsos. */

export type EntryDraft = Omit<Entry, 'id' | 'createdAt'>;

export async function addEntry(draft: EntryDraft): Promise<string> {
  const id = crypto.randomUUID();
  await db.entries.add({ ...draft, id, createdAt: new Date().toISOString() });
  return id;
}
