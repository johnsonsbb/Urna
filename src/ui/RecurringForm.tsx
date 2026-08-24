import { useMemo, useState } from 'react';
import { categoriesFor } from '../core/categories';
import { todayISO } from '../core/dates';
import { centsToInput, parseAmountToCents } from '../core/money';
import { nextOccurrences } from '../core/recurrence';
import type { Flow, Frequency, Locale, Recurring } from '../core/types';
import { formatDayMonthYear } from '../core/week';
import { saveRecurring } from '../db/recurrings';
import { BUTTON, BUTTON_DISABLED, BUTTON_PRIMARY, CONTROL, Field, Segmented } from './Controls';

/**
 * Formulário de recorrente (seção 7.4). Campos na ordem do documento, com o
 * campo de data mudando conforme a frequência escolhida, e a prévia das três
 * próximas ocorrências embaixo.
 */

const WEEKDAY_OPTIONS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTH_OPTIONS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface FormState {
  name: string;
  flow: Flow;
  amount: string;
  isVariable: boolean;
  categoryId: string;
  frequency: Frequency;
  dayOfWeek: number;
  anchorDate: string;
  dayOfMonth: number;
  month: number;
  startDate: string;
  endDate: string;
  notes: string;
}

function initialState(existing: Recurring | undefined, today: string, locale: Locale): FormState {
  const day = Number(today.slice(8, 10));
  return {
    name: existing?.name ?? '',
    flow: existing?.flow ?? 'out',
    amount: existing ? centsToInput(existing.amount, locale) : '',
    isVariable: existing?.isVariable ?? false,
    categoryId: existing?.categoryId ?? 'contas',
    frequency: existing?.frequency ?? 'monthly',
    dayOfWeek: existing?.dayOfWeek ?? 1,
    anchorDate: existing?.anchorDate ?? today,
    dayOfMonth: existing?.dayOfMonth ?? day,
    month: existing?.month ?? Number(today.slice(5, 7)),
    startDate: existing?.startDate ?? today,
    endDate: existing?.endDate ?? '',
    notes: existing?.notes ?? '',
  };
}

/** Monta o recorrente a partir do formulário, com só os campos da frequência escolhida. */
function toRecurring(form: FormState, amount: number, existing?: Recurring): Recurring {
  return {
    id: existing?.id ?? 'preview',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    name: form.name.trim(),
    flow: form.flow,
    amount,
    isVariable: form.isVariable,
    categoryId: form.categoryId,
    frequency: form.frequency,
    dayOfWeek: form.frequency === 'weekly' ? form.dayOfWeek : undefined,
    anchorDate: form.frequency === 'fortnightly' ? form.anchorDate : undefined,
    dayOfMonth:
      form.frequency === 'monthly' || form.frequency === 'yearly' ? form.dayOfMonth : undefined,
    month: form.frequency === 'yearly' ? form.month : undefined,
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    active: existing?.active ?? true,
    notes: form.notes.trim() || undefined,
  };
}

interface Props {
  existing?: Recurring;
  locale: Locale;
  onDone: () => void;
}

export function RecurringForm({ existing, locale, onDone }: Props) {
  const today = todayISO();
  const [form, setForm] = useState<FormState>(() => initialState(existing, today, locale));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const amount = parseAmountToCents(form.amount) ?? 0;
  const categories = categoriesFor(form.flow);
  const canSave = form.name.trim().length > 0 && amount > 0;

  const preview = useMemo(
    () => nextOccurrences(toRecurring(form, amount), 3, today),
    [form, amount, today],
  );

  async function handleSave() {
    if (!canSave) return;
    const { id: _id, ...rest } = toRecurring(form, amount, existing);
    await saveRecurring(existing ? { ...rest, id: existing.id } : rest);
    onDone();
  }

  return (
    <div className="pb-8">
      <header className="flex items-center gap-1 pt-[max(8px,env(safe-area-inset-top))] pb-1">
        <button type="button" onClick={onDone} className={`${BUTTON} text-steel`}>
          CANCELAR
        </button>
        <h1 className="type-display min-w-0 flex-1 truncate text-center text-base font-semibold">
          {existing ? 'Editar' : 'Novo recorrente'}
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={canSave ? BUTTON_PRIMARY : BUTTON_DISABLED}
        >
          SALVAR
        </button>
      </header>

      <Field label="NOME">
        <input
          className={CONTROL}
          value={form.name}
          onChange={(event) => set('name', event.target.value)}
          placeholder="Aluguel"
        />
      </Field>

      <div className="mt-4">
        <span className="type-display block pb-1 text-xs text-steel">ENTRA OU SAI</span>
        <Segmented
          label="Entra ou sai"
          value={form.flow}
          onChange={(flow) => {
            set('flow', flow);
            set('categoryId', categoriesFor(flow)[0]?.id ?? 'outros');
          }}
          options={[
            { value: 'out', label: 'SAI' },
            { value: 'in', label: 'ENTRA' },
          ]}
        />
      </div>

      <Field label="VALOR">
        <input
          className={`${CONTROL} type-num`}
          inputMode="decimal"
          value={form.amount}
          onChange={(event) => set('amount', event.target.value)}
          placeholder="0,00"
        />
      </Field>

      <div className="mt-4">
        <span className="type-display block pb-1 text-xs text-steel">ESSE VALOR VARIA?</span>
        <Segmented
          label="Esse valor varia?"
          value={form.isVariable ? 'sim' : 'nao'}
          onChange={(value) => set('isVariable', value === 'sim')}
          options={[
            { value: 'nao', label: 'NÃO' },
            { value: 'sim', label: 'SIM' },
          ]}
        />
      </div>

      <Field label="CATEGORIA">
        <select
          className={CONTROL}
          value={form.categoryId}
          onChange={(event) => set('categoryId', event.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="FREQUÊNCIA">
        <select
          className={CONTROL}
          value={form.frequency}
          onChange={(event) => set('frequency', event.target.value as Frequency)}
        >
          <option value="weekly">Semanal</option>
          <option value="fortnightly">Quinzenal</option>
          <option value="monthly">Mensal</option>
          <option value="yearly">Anual</option>
        </select>
      </Field>

      {form.frequency === 'weekly' && (
        <Field label="DIA DA SEMANA">
          <select
            className={CONTROL}
            value={form.dayOfWeek}
            onChange={(event) => set('dayOfWeek', Number(event.target.value))}
          >
            {WEEKDAY_OPTIONS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {form.frequency === 'fortnightly' && (
        <Field label="PRIMEIRA OCORRÊNCIA">
          <input
            className={`${CONTROL} type-num`}
            type="date"
            value={form.anchorDate}
            onChange={(event) => set('anchorDate', event.target.value)}
          />
        </Field>
      )}

      {form.frequency === 'yearly' && (
        <Field label="MÊS">
          <select
            className={CONTROL}
            value={form.month}
            onChange={(event) => set('month', Number(event.target.value))}
          >
            {MONTH_OPTIONS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
        <Field label="DIA DO MÊS">
          <select
            className={`${CONTROL} type-num`}
            value={form.dayOfMonth}
            onChange={(event) => set('dayOfMonth', Number(event.target.value))}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Field>
      )}

      {form.frequency === 'monthly' && form.dayOfMonth > 28 && (
        <p className="mt-2 text-xs text-steel">
          Mês sem dia {form.dayOfMonth} usa o último dia do mês.
        </p>
      )}

      <details className="mt-6 border-t border-hairline pt-3">
        <summary className="type-display flex h-11 cursor-pointer items-center text-xs text-steel">
          MAIS OPÇÕES
        </summary>

        <Field label="DATA DE INÍCIO">
          <input
            className={`${CONTROL} type-num`}
            type="date"
            value={form.startDate}
            onChange={(event) => set('startDate', event.target.value)}
          />
        </Field>

        <Field label="DATA DE FIM">
          <input
            className={`${CONTROL} type-num`}
            type="date"
            value={form.endDate}
            onChange={(event) => set('endDate', event.target.value)}
          />
        </Field>

        <Field label="OBSERVAÇÕES">
          <textarea
            className={`${CONTROL} h-24 py-2`}
            value={form.notes}
            onChange={(event) => set('notes', event.target.value)}
          />
        </Field>
      </details>

      <p className="mt-6 border-t border-hairline pt-3 text-sm text-steel">
        {preview.length > 0
          ? `Próximas ${preview.length}: ${preview.map((date) => formatDayMonthYear(date, locale, today)).join(', ')}`
          : 'Sem ocorrências futuras com essa regra.'}
      </p>
    </div>
  );
}
