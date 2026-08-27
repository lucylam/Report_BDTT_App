"use client";

import { Badge, Card, Icon, Select } from "@/components/ui";
import {
  scheduleAreaDescriptions,
  scheduleAreas,
  schedulePhases,
  type ScheduleArea,
  type ScheduleEvent,
  type SchedulePhase
} from "@/lib/bdttSchedule";
import { cn } from "@/lib/ui";

interface ScheduleMapProps {
  readonly events: readonly ScheduleEvent[];
  readonly dates: readonly string[];
  readonly selectedArea: "all" | ScheduleArea;
  readonly selectedDate: string;
  readonly onClear: () => void;
  readonly onDateSelect: (date: string) => void;
  readonly onSelect: (date: string, area: ScheduleArea) => void;
}

const phaseColor: Record<SchedulePhase, string> = {
  dung: "bg-[var(--danger)]",
  bangiao: "bg-[var(--warning)]",
  bdtt: "bg-[var(--info)]",
  khoidong: "bg-[var(--success)]"
};

const mapPhases = schedulePhases.filter(
  (phase) => phase.key === "dung" || phase.key === "khoidong"
);

const formatMapDate = (value: string): string => {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(year, month - 1, day));
};

const countByPhase = (
  events: readonly ScheduleEvent[]
): Record<SchedulePhase, number> => ({
  dung: events.filter((event) => event.p === "dung").length,
  bangiao: events.filter((event) => event.p === "bangiao").length,
  bdtt: events.filter((event) => event.p === "bdtt").length,
  khoidong: events.filter((event) => event.p === "khoidong").length
});

const PhaseSegments = ({
  counts,
  compact = false
}: {
  readonly counts: Readonly<Record<SchedulePhase, number>>;
  readonly compact?: boolean;
}): React.ReactElement => {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <span
      aria-label={mapPhases
        .filter((phase) => counts[phase.key] > 0)
        .map((phase) => `${phase.label}: ${counts[phase.key]}`)
        .join(", ")}
      className={cn(
        "flex w-full overflow-hidden rounded-full bg-[var(--line-soft)]",
        compact ? "h-1.5" : "h-2"
      )}
      role="img"
    >
      {mapPhases.map((phase) =>
        counts[phase.key] > 0 ? (
          <span
            className={phaseColor[phase.key]}
            key={phase.key}
            style={{ width: `${(counts[phase.key] / total) * 100}%` }}
          />
        ) : null
      )}
    </span>
  );
};

export const ScheduleMap = ({
  dates,
  events,
  selectedArea,
  selectedDate,
  onClear,
  onDateSelect,
  onSelect
}: ScheduleMapProps): React.ReactElement => {
  const mobileDate = selectedDate === "all" ? (dates[0] ?? "2026-09-14") : selectedDate;
  const hasMapSelection = selectedDate !== "all" || selectedArea !== "all";

  const eventsFor = (date: string, area: ScheduleArea): readonly ScheduleEvent[] =>
    events.filter((event) => event.d === date && event.x === area);

  return (
    <Card className="min-w-0 p-3 sm:p-4" variant="solid">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--info-soft)] text-[var(--info-strong)]">
            <Icon name="chart" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold leading-6">Bản đồ lịch BDTT</h2>
            <p className="break-words text-sm leading-5 text-[var(--text-muted)]">
              Chọn một ngày và khu vực để xem các mốc tương ứng.
            </p>
          </div>
        </div>

        {hasMapSelection ? (
          <button
            className="focus-ring pressable min-h-11 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)]"
            onClick={onClear}
            type="button"
          >
            Xem toàn bộ
          </button>
        ) : null}
      </div>

      <div aria-label="Chú giải bản đồ lịch" className="mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-2">
        {mapPhases.map((phase) => (
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--text-muted)]" key={phase.key}>
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", phaseColor[phase.key])} />
            <span className="break-words">{phase.label}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 hidden min-w-0 xl:block">
        <div
          aria-label="Bản đồ các mốc theo ngày và khu vực"
          className="grid min-w-0 overflow-hidden rounded-[var(--radius-field)] border border-[var(--line)]"
          role="grid"
          style={{ gridTemplateColumns: `minmax(9.5rem, 1.7fr) repeat(${dates.length}, minmax(3.4rem, 1fr))` }}
        >
          <div className="flex min-h-14 items-center border-b border-r border-[var(--line)] bg-[var(--surface-muted)] px-3 text-sm font-semibold text-[var(--text-muted)]" role="columnheader">
            Khu vực
          </div>
          {dates.map((date) => (
            <div className="flex min-h-14 min-w-0 flex-col items-center justify-center border-b border-r border-[var(--line)] bg-[var(--surface-muted)] px-1 text-center text-sm font-semibold leading-5 text-[var(--text-muted)] last:border-r-0" key={date} role="columnheader">
              {formatMapDate(date).split(", ").map((part) => <span className="block break-words" key={part}>{part}</span>)}
            </div>
          ))}

          {scheduleAreas.map((area, areaIndex) => (
            <div className="contents" key={area} role="row">
              <div className={cn("flex min-h-16 min-w-0 flex-col justify-center border-r border-[var(--line)] bg-[var(--surface)] px-3 py-2", areaIndex < scheduleAreas.length - 1 && "border-b")} role="rowheader">
                <strong className="break-words text-sm leading-5 text-[var(--foreground)]">{area}</strong>
                <span className="break-words text-sm leading-5 text-[var(--text-muted)]">{scheduleAreaDescriptions[area]}</span>
              </div>
              {dates.map((date, dateIndex) => {
                const cellEvents = eventsFor(date, area);
                const counts = countByPhase(cellEvents);
                const selected = selectedDate === date && selectedArea === area;
                const isLastColumn = dateIndex === dates.length - 1;
                const isLastRow = areaIndex === scheduleAreas.length - 1;
                return (
                  <button
                    aria-label={`${formatMapDate(date)}, ${area}: ${cellEvents.length} mốc`}
                    aria-selected={selected}
                    className={cn(
                      "focus-ring pressable flex min-h-16 min-w-0 flex-col items-center justify-center gap-2 border-r border-[var(--line)] bg-[var(--surface)] px-1.5 py-2 text-center",
                      !isLastRow && "border-b",
                      isLastColumn && "border-r-0",
                      selected && "relative z-10 bg-[var(--primary-soft)] ring-2 ring-inset ring-[var(--primary-strong)]",
                      cellEvents.length === 0 && "cursor-default bg-[var(--surface-muted)] opacity-55"
                    )}
                    disabled={cellEvents.length === 0}
                    key={`${area}-${date}`}
                    onClick={() => onSelect(date, area)}
                    role="gridcell"
                    title={`${formatMapDate(date)} · ${area} · ${cellEvents.length} mốc`}
                    type="button"
                  >
                    <span className="text-base font-semibold tabular-nums text-[var(--foreground)]">{cellEvents.length || "–"}</span>
                    {cellEvents.length ? <PhaseSegments compact counts={counts} /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3 xl:hidden">
        <label className="block min-w-0">
          <span className="mb-1.5 block break-words text-sm font-semibold text-[var(--text-muted)]">Ngày trên bản đồ</span>
          <Select onChange={(event) => onDateSelect(event.target.value)} value={mobileDate}>
            {dates.map((date) => <option key={date} value={date}>{formatMapDate(date)}</option>)}
          </Select>
        </label>

        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {scheduleAreas.map((area) => {
            const areaEvents = eventsFor(mobileDate, area);
            const counts = countByPhase(areaEvents);
            const selected = selectedDate === mobileDate && selectedArea === area;
            return (
              <button
                aria-label={`${formatMapDate(mobileDate)}, ${area}: ${areaEvents.length} mốc`}
                aria-pressed={selected}
                className={cn(
                  "focus-ring pressable min-h-20 min-w-0 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-3 text-left shadow-[var(--shadow-soft-sm)]",
                  selected && "border-[var(--primary-strong)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary-strong)]",
                  areaEvents.length === 0 && "cursor-default bg-[var(--surface-muted)] opacity-60"
                )}
                disabled={areaEvents.length === 0}
                key={area}
                onClick={() => onSelect(mobileDate, area)}
                type="button"
              >
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="min-w-0">
                    <strong className="block break-words text-base leading-5 text-[var(--foreground)]">{area}</strong>
                    <span className="mt-0.5 block break-words text-sm leading-5 text-[var(--text-muted)]">{scheduleAreaDescriptions[area]}</span>
                  </span>
                  <Badge className="shrink-0 whitespace-nowrap" tone={areaEvents.length ? "primary" : "neutral"}>{areaEvents.length}</Badge>
                </span>
                {areaEvents.length ? <span className="mt-3 block"><PhaseSegments counts={counts} /></span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {hasMapSelection ? (
        <div aria-live="polite" className="mt-3 flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--radius-field)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-medium text-[var(--primary-strong)]">
          <Icon className="h-4 w-4" name="filter" />
          <span className="break-words">
            Đang lọc: {selectedDate === "all" ? "tất cả ngày" : formatMapDate(selectedDate)} · {selectedArea === "all" ? "tất cả khu vực" : selectedArea}
          </span>
        </div>
      ) : null}
    </Card>
  );
};
