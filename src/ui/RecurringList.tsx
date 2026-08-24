import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { categoryLabel } from '../core/categories';
import { describeRule } from '../core/describe';
import { formatMoney } from '../core/money';
import type { Locale, Recurring } from '../core/types';
import { db } from '../db/db';
import { deleteRecurring, setRecurringActive } from '../db/recurrings';
import { BUTTON } from './Controls';
import { CategoryIcon } from './CategoryIcon';

/**
 * Lista de recorrentes (seção 7.3): uma lista só, separada em Sai e Entra,
 * com a regra escrita em linguagem natural embaixo do nome.
 *
 * A confirmação de exclusão acontece dentro do próprio cartão. É menos peça
 * que um modal e deixa visível qual conta está para sumir.
 */

function Item({
  recurring,
  locale,
  onEdit,
}: {
  recurring: Recurring;
  locale: Locale;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="mt-2 rounded-card bg-slab p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-steel">
          <CategoryIcon categoryId={recurring.categoryId} />
        </span>

        <div className="min-w-0 flex-1">
          <p className={`truncate ${recurring.active ? '' : 'text-steel'}`}>{recurring.name}</p>
          {/* "Pausado" fica fora do trecho que trunca: em 320px a regra corta
              antes do fim e o estado sumiria junto. */}
          <p className="flex gap-1 text-xs text-steel">
            {!recurring.active && <span className="type-display shrink-0 font-semibold">PAUSADO ·</span>}
            <span className="truncate">
              {describeRule(recurring, locale)} · {categoryLabel(recurring.categoryId)}
            </span>
          </p>
        </div>

        <span className="type-num shrink-0 whitespace-nowrap">
          {recurring.isVariable && <span aria-hidden="true">~</span>}
          {formatMoney(recurring.amount, locale)}
        </span>
      </div>

      {confirming ? (
        <div className="mt-2 border-t border-hairline pt-2">
          <p className="text-xs text-steel">
            Excluir leva junto o histórico de pagamentos e valores dessa conta.
          </p>
          <div className="mt-1 flex justify-end gap-1">
            <button type="button" onClick={() => setConfirming(false)} className={`${BUTTON} text-steel`}>
              CANCELAR
            </button>
            <button
              type="button"
              onClick={() => void deleteRecurring(recurring.id)}
              className={`${BUTTON} bg-ink text-slab`}
            >
              EXCLUIR
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex justify-end gap-1">
          <button type="button" onClick={onEdit} className={BUTTON}>
            EDITAR
          </button>
          <button
            type="button"
            onClick={() => void setRecurringActive(recurring.id, !recurring.active)}
            className={BUTTON}
          >
            {recurring.active ? 'PAUSAR' : 'RETOMAR'}
          </button>
          <button type="button" onClick={() => setConfirming(true)} className={BUTTON}>
            EXCLUIR
          </button>
        </div>
      )}
    </li>
  );
}

function Section({
  title,
  items,
  locale,
  onEdit,
}: {
  title: string;
  items: Recurring[];
  locale: Locale;
  onEdit: (recurring: Recurring) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-5">
      <h2 className="type-display text-xs text-steel">{title}</h2>
      <ul>
        {items.map((recurring) => (
          <Item
            key={recurring.id}
            recurring={recurring}
            locale={locale}
            onEdit={() => onEdit(recurring)}
          />
        ))}
      </ul>
    </section>
  );
}

interface Props {
  locale: Locale;
  onNew: () => void;
  onEdit: (recurring: Recurring) => void;
}

export function RecurringList({ locale, onNew, onEdit }: Props) {
  const recurrings = useLiveQuery(() => db.recurrings.toArray(), [], undefined);
  const sorted = [...(recurrings ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div>
      <header className="flex items-center gap-1 pt-[max(8px,env(safe-area-inset-top))] pb-1">
        <h1 className="type-display min-w-0 flex-1 truncate text-lead font-semibold">Recorrentes</h1>
        <button type="button" onClick={onNew} className={`${BUTTON} bg-ink text-slab`}>
          NOVO
        </button>
      </header>

      {recurrings && sorted.length === 0 && (
        <p className="mt-4 text-sm text-steel">Nada cadastrado ainda.</p>
      )}

      <Section
        title="SAI"
        items={sorted.filter((r) => r.flow === 'out')}
        locale={locale}
        onEdit={onEdit}
      />
      <Section
        title="ENTRA"
        items={sorted.filter((r) => r.flow === 'in')}
        locale={locale}
        onEdit={onEdit}
      />
    </div>
  );
}
