import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildDayItems, itemsOn, peaks, sumTotals, totalsByDay, type DayItem } from '../core/day';
import { expandOccurrences } from '../core/recurrence';
import { todayISO } from '../core/dates';
import type { ISODate } from '../core/types';
import { isSameWeek, shiftWeek, weekOf } from '../core/week';
import { db, DEFAULT_SETTINGS, getSettings } from '../db/db';
import { setAmountOverride, setPaidEarly } from '../db/mutations';
import { DayList } from './DayList';
import { EntrySheet } from './EntrySheet';
import { ResultLine } from './ResultLine';
import { WeekHeader } from './WeekHeader';
import { WeekRuler } from './WeekRuler';

/** Arrastar para o lado troca de semana. Não pode roubar o scroll vertical. */
function useHorizontalSwipe(onLeft: () => void, onRight: () => void) {
  const origin = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      origin.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: React.PointerEvent) => {
      const start = origin.current;
      origin.current = null;
      if (!start) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      if (dx < 0) onLeft();
      else onRight();
    },
  };
}

export function Home() {
  const settings = useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
  const today = todayISO();

  const [anchor, setAnchor] = useState<ISODate>(today);
  const [selected, setSelected] = useState<ISODate>(today);

  const week = useMemo(() => weekOf(anchor, settings.weekStartsOn), [anchor, settings.weekStartsOn]);
  // Trocar o início da semana pode deixar o dia selecionado fora da grade.
  const selectedDay = week.days.includes(selected) ? selected : week.start;

  const data = useLiveQuery(
    async () => {
      const [recurrings, overrides, entries] = await Promise.all([
        db.recurrings.toArray(),
        db.overrides.where('date').between(week.start, week.end, true, true).toArray(),
        db.entries.where('date').between(week.start, week.end, true, true).toArray(),
      ]);
      return { recurrings, overrides, entries };
    },
    [week.start, week.end],
  );

  const items = useMemo(() => {
    if (!data) return [];
    const occurrences = expandOccurrences(data.recurrings, data.overrides, week.start, week.end);
    return buildDayItems(occurrences, data.entries);
  }, [data, week.start, week.end]);

  const variableIds = useMemo(
    () => new Set((data?.recurrings ?? []).filter((r) => r.isVariable).map((r) => r.id)),
    [data],
  );

  const byDay = useMemo(() => totalsByDay(items), [items]);
  const dayItems = useMemo(() => itemsOn(items, selectedDay), [items, selectedDay]);

  function goToWeek(delta: number) {
    setAnchor((current) => shiftWeek(current, delta));
    setSelected((current) => shiftWeek(current, delta));
  }

  function goToToday() {
    setAnchor(today);
    setSelected(today);
  }

  const swipe = useHorizontalSwipe(() => goToWeek(1), () => goToWeek(-1));
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleTogglePaid(item: DayItem, paid: boolean) {
    void setPaidEarly(item.sourceId, item.date, paid);
  }

  function handleSetAmount(item: DayItem, amountInCents: number | undefined) {
    void setAmountOverride(item.sourceId, item.date, amountInCents);
  }

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pb-24" {...swipe}>
      <WeekHeader
        week={week}
        locale={settings.locale}
        isCurrentWeek={isSameWeek(anchor, today, settings.weekStartsOn)}
        onPrevious={() => goToWeek(-1)}
        onNext={() => goToWeek(1)}
        onToday={goToToday}
      />

      <WeekRuler
        week={week}
        today={today}
        selected={selectedDay}
        locale={settings.locale}
        totalsByDay={byDay}
        peaks={peaks(byDay)}
        onSelect={setSelected}
      />

      <ResultLine totals={sumTotals(items)} locale={settings.locale} />

      <DayList
        date={selectedDay}
        items={dayItems}
        locale={settings.locale}
        variableIds={variableIds}
        onTogglePaid={handleTogglePaid}
        onSetAmount={handleSetAmount}
      />

      {/* Botão flutuante: fica acima da barra inferior e respeita a safe area. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-[480px] justify-end px-4">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Adicionar gasto avulso"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-btn bg-hivis text-ink active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
      </div>

      {sheetOpen && <EntrySheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
