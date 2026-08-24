import type { ReactNode } from 'react';
import { formatMoney, parseAmountToCents } from '../core/money';
import type { Locale } from '../core/types';

/**
 * Peças de formulário compartilhadas. Tudo com 44px de altura e 16px de fonte:
 * abaixo disso o Safari dá zoom ao focar e o alvo de toque fica curto.
 */

export const CONTROL =
  'h-11 w-full rounded-btn border border-hairline bg-slab px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink';

export const BUTTON =
  'flex h-11 items-center justify-center rounded-btn px-3 type-display text-xs font-semibold active:bg-hairline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/** Ação primária: sólida, nunca fantasma. */
export const BUTTON_PRIMARY = `${BUTTON} bg-ink text-slab`;

/** Ação primária de acento, para o "adicionar" do gasto avulso. */
export const BUTTON_ACCENT = `${BUTTON} bg-hivis text-ink`;

/** Desabilitado continua parecendo botão: tem borda e superfície, só não age. */
export const BUTTON_DISABLED = `${BUTTON} border border-hairline bg-slab text-steel`;

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="type-display block pb-1 text-xs text-steel">{label}</span>
      {children}
    </label>
  );
}

/** Alternador de duas ou mais opções, sem depender de hover. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex gap-1 rounded-btn" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`type-display h-11 flex-1 rounded-btn border text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
              selected ? 'border-ink bg-ink text-slab' : 'border-hairline bg-slab text-steel active:bg-hairline'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Campo de dinheiro. Formata ao sair do campo: quem digita 180 querendo 1,80
 * vê "$ 180,00" na hora, e não descobre o engano semanas depois numa lista.
 * Ao focar seleciona tudo, senão digitar por cima do valor já formatado
 * produz número esquisito.
 */
export function AmountInput({
  value,
  onChange,
  locale,
  label,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      className={`${CONTROL} type-num`}
      inputMode="decimal"
      aria-label={label}
      placeholder="0,00"
      value={value}
      onFocus={(event) => event.target.select()}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        const cents = parseAmountToCents(value);
        if (cents !== null && cents > 0) onChange(formatMoney(cents, locale));
      }}
    />
  );
}

/**
 * Bloco recolhido. O `summary` tem cara de controle — borda, superfície e
 * seta que gira — porque sem isso lê como linha de texto e ninguém toca.
 */
export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group mt-4">
      <summary className="type-display flex h-11 cursor-pointer list-none items-center justify-between rounded-btn border border-hairline bg-slab px-3 text-xs text-steel active:bg-hairline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
        {label}
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
          className="transition-transform duration-[120ms] group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      {children}
    </details>
  );
}
