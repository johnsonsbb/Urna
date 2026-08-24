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

  function handleTogglePaid(item: DayItem, paid: boolean) {
    void setPaidEarly(item.sourceId, item.date, paid);
  }

  function handleSetAmount(item: DayItem, amountInCents: number | undefined) {
    void setAmountOverride(item.sourceId, item.date, amountInCents);
  }

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
      {...swipe}
    >
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
    </div>
  );
}
