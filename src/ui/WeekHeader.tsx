import { formatWeekRange, type Week } from '../core/week';
import type { Locale } from '../core/types';

/**
 * Cabeçalho compacto: intervalo da semana e as setas. O botão "hoje" só existe
 * quando você não está na semana atual.
 */

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  );
}

const TAP =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-btn active:bg-hairline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

interface Props {
  week: Week;
  locale: Locale;
  isCurrentWeek: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekHeader({ week, locale, isCurrentWeek, onPrevious, onNext, onToday }: Props) {
  return (
    <header className="flex items-center gap-1 pt-[max(8px,env(safe-area-inset-top))] pb-1">
      <button type="button" onClick={onPrevious} className={TAP} aria-label="Semana anterior">
        <Chevron direction="left" />
      </button>

      <h1 className="type-display min-w-0 flex-1 truncate text-center text-base font-semibold">
        {formatWeekRange(week, locale)}
      </h1>

      {!isCurrentWeek && (
        <button type="button" onClick={onToday} className={`${TAP} type-display text-xs font-semibold`}>
          HOJE
        </button>
      )}

      <button type="button" onClick={onNext} className={TAP} aria-label="Próxima semana">
        <Chevron direction="right" />
      </button>
    </header>
  );
}
