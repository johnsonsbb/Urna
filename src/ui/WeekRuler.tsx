import type { Totals } from '../core/day';
import type { ISODate, Locale } from '../core/types';
import { dayNumber, weekdayLabel, type Week } from '../core/week';

/**
 * Elemento assinatura (seção 8.3). Sete colunas de largura igual em fração,
 * altura fixa de 88px que não escala com a largura.
 *
 * A barra de saída sobe a partir da linha de base, em ink; a de entrada desce
 * abaixo dela, em hivis. A altura é proporcional ao dia mais pesado da semana —
 * saída normalizada pela maior saída, entrada pela maior entrada, cada uma na
 * sua faixa, senão um salário achataria o relevo inteiro das contas.
 */

const HEIGHT = 88;
const LABEL_ROW = 16;
const NUMBER_ROW = 20;
const OUT_AREA = 32;
const IN_AREA = 19; // 16 + 20 + 32 + 1 (linha de base) + 19 = 88

function barHeight(value: number, peak: number, area: number): number {
  if (value <= 0 || peak <= 0) return 0;
  // Dia com movimento sempre aparece, nem que seja como um traço.
  return Math.max(3, Math.round((value / peak) * area));
}

interface Props {
  week: Week;
  today: ISODate;
  selected: ISODate;
  locale: Locale;
  totalsByDay: Map<ISODate, Totals>;
  peaks: { out: number; in: number };
  onSelect: (date: ISODate) => void;
}

export function WeekRuler({ week, today, selected, locale, totalsByDay, peaks, onSelect }: Props) {
  return (
    <div className="grid grid-cols-7" style={{ height: HEIGHT }} role="group" aria-label="Semana">
      {week.days.map((day) => {
        const totals = totalsByDay.get(day);
        const isToday = day === today;
        const isSelected = day === selected;
        const hasMovement = Boolean(totals && (totals.out > 0 || totals.in > 0));

        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            aria-label={`${weekdayLabel(day, 'short', locale)} ${dayNumber(day)}`}
            className={`relative flex flex-col items-center rounded-btn transition-colors duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
              isToday ? 'bg-slab' : ''
            }`}
            style={{ height: HEIGHT }}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-[2px] bg-ink transition-opacity duration-[120ms] ${
                isSelected ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <span
              className="type-display flex items-center text-xs text-steel"
              style={{ height: LABEL_ROW }}
            >
              <span className="min-[360px]:hidden">{weekdayLabel(day, 'narrow', locale)}</span>
              <span className="hidden min-[360px]:inline">{weekdayLabel(day, 'short', locale)}</span>
            </span>

            <span
              className={`type-num flex items-center text-sm ${
                isToday ? 'font-semibold text-ink' : hasMovement ? 'text-ink' : 'text-steel'
              }`}
              style={{ height: NUMBER_ROW }}
            >
              {dayNumber(day)}
            </span>

            <span className="flex w-full items-end justify-center" style={{ height: OUT_AREA }}>
              <span
                className="w-[45%] bg-ink"
                style={{ height: barHeight(totals?.out ?? 0, peaks.out, OUT_AREA) }}
              />
            </span>

            <span className="w-full border-t border-hairline" />

            <span className="flex w-full items-start justify-center" style={{ height: IN_AREA }}>
              <span
                className="w-[45%] bg-hivis"
                style={{ height: barHeight(totals?.in ?? 0, peaks.in, IN_AREA) }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
