import type { ReactNode } from 'react';

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
