"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

const seedNotes = (): Record<string, string> => {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  return {
    [iso]: "Review uploads, tune wallpapers, and keep the workspace tidy.",
  };
};

const getMonthDays = (cursor: Date) => {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const leading = start.getDay();
  const days: Array<{ date: Date; muted: boolean }> = [];

  for (let i = leading; i > 0; i -= 1) {
    days.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth(), 1 - i),
      muted: true,
    });
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    days.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth(), day),
      muted: false,
    });
  }

  let trailingDay = 1;
  while (days.length % 7 !== 0) {
    days.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, trailingDay),
      muted: true,
    });
    trailingDay += 1;
  }

  return days;
};

export const CalendarApp = () => {
  const [cursor, setCursor] = useState(() => new Date());
  const [notes, setNotes] = useState<Record<string, string>>(() => seedNotes());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const monthDays = useMemo(() => getMonthDays(cursor), [cursor]);
  const today = new Date().toISOString().slice(0, 10);

  const selectedDateValue = selectedDate in notes ? notes[selectedDate] : "";

  return (
    <div className="ui-glass h-full rounded-b-2xl border-0 p-4 text-[var(--text-primary)]">
      <div className="grid h-full min-h-0 grid-cols-[1.4fr_0.9fr] gap-4">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-white/45">Planner</div>
              <h2 className="mt-1 text-2xl font-semibold text-white">{monthFormatter.format(cursor)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="rounded-2xl border border-white/10 bg-white/8 p-2"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="rounded-2xl border border-white/10 bg-white/8 p-2"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.2em] text-white/40">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={dayFormatter.format(new Date(2024, 0, index + 7))}>
                {dayFormatter.format(new Date(2024, 0, index + 7))}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {monthDays.map(({ date, muted }) => {
              const iso = date.toISOString().slice(0, 10);
              const selected = iso === selectedDate;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  className={`min-h-20 rounded-3xl border px-2 py-3 text-left transition ${
                    selected
                      ? "border-cyan-200/55 bg-cyan-300/20"
                      : "border-white/8 bg-white/[0.04] hover:bg-white/[0.08]"
                  } ${muted ? "opacity-45" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isToday ? "text-cyan-100" : "text-white/90"}`}>
                      {date.getDate()}
                    </span>
                    {notes[iso] && <span className="h-2 w-2 rounded-full bg-orange-300" />}
                  </div>
                  <div className="mt-6 text-[10px] text-white/40">{isToday ? "Today" : muted ? "Adjacent" : "Open"}</div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Day Note</div>
          <div className="mt-2 text-xl font-semibold text-white">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <textarea
            value={selectedDateValue}
            onChange={(event) =>
              setNotes((current) => ({
                ...current,
                [selectedDate]: event.target.value,
              }))
            }
            placeholder="Write a reminder for this date..."
            className="mt-4 h-48 w-full rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none placeholder:text-white/28"
          />
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            Use this as a lightweight planner inside the OS. Notes stay live while the app is open, so it works well for temporary planning sessions.
          </div>
        </aside>
      </div>
    </div>
  );
};
