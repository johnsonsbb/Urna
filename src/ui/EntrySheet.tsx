import { useEffect, useState } from 'react';
import { categoriesFor } from '../core/categories';
import type { Locale } from '../core/types';
import { todayISO } from '../core/dates';
import { formatDayMonthYear } from '../core/week';
import { parseAmountToCents } from '../core/money';
import { addEntry } from '../db/entries';
import { BUTTON_ACCENT, BUTTON_DISABLED, CONTROL, Field } from './Controls';

/**
 * Gasto avulso (seção 7.5): modal que sobe de baixo em 200ms. Três campos
 * visíveis, data recolhida com hoje, e um botão só.
 *
 * Registrar tem que levar menos de dez segundos, por isso o foco já cai no
 * valor e o teclado abre numérico.
 */
export function EntrySheet({ locale = 'pt-BR', onClose }: { locale?: Locale; onClose: () => void }) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('mercado');
  const [date, setDate] = useState(today);

  // Sobe no primeiro quadro depois de montar, senão não há o que animar.
  useEffect(() => setOpen(true), []);

  const cents = parseAmountToCents(amount) ?? 0;
  const canAdd = cents > 0 && name.trim().length > 0;

  async function handleAdd() {
    if (!canAdd) return;
    await addEntry({ name: name.trim(), flow: 'out', amount: cents, date, categoryId });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end" role="dialog" aria-modal="true" aria-label="Adicionar gasto avulso">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className={`absolute inset-0 bg-ink transition-opacity duration-200 ${open ? 'opacity-30' : 'opacity-0'}`}
      />

      <div
        className={`relative mx-auto w-full max-w-[480px] rounded-t-card bg-slab px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <h2 className="type-display text-base font-semibold">Gasto avulso</h2>

        <Field label="VALOR">
          <input
            autoFocus
            className={`${CONTROL} type-num`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
          />
        </Field>

        <Field label="NOME">
          <input
            className={CONTROL}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Mercado"
          />
        </Field>

        <Field label="CATEGORIA">
          <select
            className={CONTROL}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categoriesFor('out').map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <details className="mt-3">
          <summary className="type-display flex h-11 cursor-pointer items-center text-xs text-steel">
            DATA · {formatDayMonthYear(date, locale, today)}
          </summary>
          <input
            className={`${CONTROL} type-num`}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Data do gasto"
          />
        </details>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={`${canAdd ? BUTTON_ACCENT : BUTTON_DISABLED} mt-4 w-full`}
        >
          ADICIONAR
        </button>
      </div>
    </div>
  );
}
