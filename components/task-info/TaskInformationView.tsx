"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Icon, Input, Select } from "@/components/ui";
import { ScheduleMap } from "@/components/task-info/ScheduleMap";
import {
  scheduleAreaDescriptions,
  scheduleAreas,
  scheduleEvents,
  schedulePhases,
  type ScheduleArea,
  type ScheduleEvent,
  type SchedulePhase
} from "@/lib/bdttSchedule";
import { cn } from "@/lib/ui";

type PhaseFilter = "all" | SchedulePhase;
type AreaFilter = "all" | ScheduleArea;

const scheduleDates = [...new Set(scheduleEvents.map((event) => event.d))].sort();

const phaseMeta: Record<
  SchedulePhase,
  { readonly label: string; readonly tone: "danger" | "warning" | "info" | "success"; readonly dot: string }
> = {
  dung: { label: "Dừng máy", tone: "danger", dot: "bg-[var(--danger)]" },
  pssr: { label: "PSSR", tone: "warning", dot: "bg-[var(--warning)]" },
  khoidong: { label: "Khởi động", tone: "success", dot: "bg-[var(--success)]" }
};

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi-VN");

const formatDate = (value: string): string => {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
};

const compareEvents = (left: ScheduleEvent, right: ScheduleEvent): number => {
  const dateOrder = left.d.localeCompare(right.d);
  if (dateOrder !== 0) return dateOrder;
  const leftTime = /^\d{2}:\d{2}$/.test(left.h) ? left.h : "99:99";
  const rightTime = /^\d{2}:\d{2}$/.test(right.h) ? right.h : "99:99";
  return leftTime.localeCompare(rightTime);
};

const SummaryCard = ({
  icon,
  label,
  value,
  detail,
  toneClass
}: {
  readonly icon: "calendar" | "history" | "list" | "check";
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly toneClass: string;
}): React.ReactElement => (
  <Card className="min-w-0 p-3 sm:p-4" variant="solid">
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", toneClass)}>
      <Icon className="h-5 w-5" name={icon} />
      <span className="min-w-0 flex-1 break-words text-sm font-semibold uppercase leading-5">{label}</span>
    </div>
    <p className="mt-2 break-words text-xl font-semibold leading-tight tabular-nums text-[var(--foreground)] sm:text-2xl">
      {value}
    </p>
    <p className="mt-1 break-words text-sm leading-5 text-[var(--text-muted)]">{detail}</p>
  </Card>
);

const ScheduleEventRow = ({ event }: { readonly event: ScheduleEvent }): React.ReactElement => {
  const meta = phaseMeta[event.p];
  const hasDetails = Boolean(event.n || event.bar);

  const content = (
    <>
      <span className="w-[3.6rem] shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
        {event.h}
      </span>
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <strong className="break-words text-base leading-5 text-[var(--foreground)]">{event.c}</strong>
          <Badge className="whitespace-nowrap" tone={meta.tone}>{meta.label}</Badge>
          {hasDetails ? <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" name="chevronDown" /> : null}
        </span>
        <span className="mt-1 block break-words text-sm font-medium leading-5 text-[var(--text-muted)]">{event.x}</span>
        <span className="mt-1 block break-words text-base leading-6 text-[var(--foreground)]">{event.s}</span>
      </span>
    </>
  );

  if (!hasDetails) {
    return <div className="flex min-w-0 items-start gap-2.5 px-3 py-3 sm:px-4">{content}</div>;
  }

  return (
    <details className="group">
      <summary className="focus-ring flex min-h-12 min-w-0 cursor-pointer list-none items-start gap-2.5 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        {content}
      </summary>
      <div className="ml-[5.35rem] mr-3 border-l-2 border-[var(--line)] pb-3 pl-3 text-sm leading-5 text-[var(--text-muted)] sm:mr-4">
        {event.n ? <p className="break-words">{event.n}</p> : null}
        {event.bar ? <p className="mt-1 break-words">Kết thúc dự kiến: {formatDate(event.bar.slice(0, 10))} · {event.bar.slice(11)}</p> : null}
      </div>
    </details>
  );
};

export const TaskInformationView = (): React.ReactElement => {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<PhaseFilter>("all");
  const [area, setArea] = useState<AreaFilter>("all");
  const [date, setDate] = useState("all");

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return [...scheduleEvents]
      .filter((event) => phase === "all" || event.p === phase)
      .filter((event) => {
        if (!normalizedQuery) return true;
        return normalize(`${event.c} ${event.s} ${event.x} ${event.n ?? ""}`).includes(normalizedQuery);
      })
      .filter((event) => area === "all" || event.x === area)
      .filter((event) => date === "all" || event.d === date)
      .sort(compareEvents);
  }, [area, date, phase, query]);

  const mapEvents = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return scheduleEvents.filter((event) => {
      if (phase !== "all" && event.p !== phase) return false;
      if (!normalizedQuery) return true;
      return normalize(`${event.c} ${event.s} ${event.x} ${event.n ?? ""}`).includes(normalizedQuery);
    });
  }, [phase, query]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, ScheduleEvent[]>();
    filteredEvents.forEach((event) => {
      const group = groups.get(event.d) ?? [];
      group.push(event);
      groups.set(event.d, group);
    });
    return [...groups.entries()];
  }, [filteredEvents]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <section aria-label="Tổng quan lịch BDTT 2026" className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
        <SummaryCard icon="calendar" label="Dừng Nhà máy" value="20:00 · 19/09" detail="Hoàn tất 09:30 · 22/09 · 61,5 giờ" toneClass="text-[var(--danger-strong)]" />
        <SummaryCard icon="history" label="PSSR" value="15:00 · 26/09" detail="Hoàn tất 19:00 · 30/09 · 100 giờ" toneClass="text-[var(--warning-strong)]" />
        <SummaryCard icon="list" label="Khởi động Nhà máy" value="13:00 · 29/09" detail="Hoàn tất 03:00 · 02/10 · 62 giờ" toneClass="text-[var(--info-strong)]" />
        <SummaryCard icon="check" label="Hoàn tất" value="03:00 · 02/10" detail="Phụ trợ 01/10 · Urê 01/10 · Ammonia 02/10" toneClass="text-[var(--success-strong)]" />
      </section>

      <Card className="min-w-0 p-3 sm:p-4" variant="solid">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-soft)] text-[var(--primary-strong)]">
            <Icon name="filter" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold leading-6">Tra cứu lịch</h2>
            <p className="break-words text-sm leading-5 text-[var(--text-muted)]">{filteredEvents.length}/{scheduleEvents.length} mốc phù hợp</p>
          </div>
        </div>

        <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_minmax(13rem,0.32fr)_minmax(13rem,0.32fr)]">
          <label className="relative block min-w-0">
            <span className="sr-only">Tìm mốc công việc hoặc thiết bị</span>
            <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" name="search" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm thiết bị, cụm hoặc nội dung…" type="search" value={query} />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Lọc theo ngày</span>
            <Select onChange={(event) => setDate(event.target.value)} value={date}>
              <option value="all">Tất cả ngày</option>
              {scheduleDates.map((item) => <option key={item} value={item}>{formatDate(item)}</option>)}
            </Select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Lọc theo khu vực</span>
            <Select onChange={(event) => setArea(event.target.value as AreaFilter)} value={area}>
              <option value="all">Tất cả khu vực</option>
              {scheduleAreas.map((item) => <option key={item} value={item}>{item} · {scheduleAreaDescriptions[item]}</option>)}
            </Select>
          </label>
        </div>

        <div aria-label="Lọc theo giai đoạn" className="mt-3 flex min-w-0 flex-wrap gap-2" role="group">
          <button aria-pressed={phase === "all"} className={cn("focus-ring pressable min-h-11 rounded-full border px-4 text-sm font-semibold", phase === "all" ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)]")} onClick={() => setPhase("all")} type="button">Tất cả</button>
          {schedulePhases.map((item) => {
            const meta = phaseMeta[item.key];
            const selected = phase === item.key;
            return <button aria-pressed={selected} className={cn("focus-ring pressable flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold", selected ? "border-[var(--primary-strong)] bg-[var(--primary-soft)] text-[var(--primary-strong)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)]")} key={item.key} onClick={() => setPhase(item.key)} type="button"><span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />{item.label}</button>;
          })}
        </div>
      </Card>

      <ScheduleMap
        dates={scheduleDates}
        events={mapEvents}
        onClear={() => {
          setDate("all");
          setArea("all");
        }}
        onDateSelect={(selectedDate) => {
          setDate(selectedDate);
          setArea("all");
        }}
        onSelect={(selectedDate, selectedArea) => {
          setDate(selectedDate);
          setArea(selectedArea);
        }}
        selectedArea={area}
        selectedDate={date}
      />

      <div className="min-w-0">
        <section aria-labelledby="schedule-timeline-heading" className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-center gap-3 px-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--info-soft)] text-[var(--info-strong)]"><Icon name="calendar" /></span>
            <div className="min-w-0"><h2 className="break-words text-xl font-semibold leading-7 capitalize" id="schedule-timeline-heading">{date === "all" ? "Lịch 19/09–02/10/2026" : formatDate(date)}</h2><p className="break-words text-sm leading-5 text-[var(--text-muted)]">Chạm vào mốc có ghi chú để xem đầy đủ.</p></div>
          </div>

          {groupedEvents.length ? groupedEvents.map(([date, events]) => (
            <Card className="min-w-0 overflow-hidden" key={date} padding="none" variant="solid">
              <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface-muted)] px-3 py-3 sm:px-4">
                <h3 className="break-words text-base font-semibold leading-6 capitalize text-[var(--foreground)]">{formatDate(date)}</h3>
                <Badge className="whitespace-nowrap" tone="primary">{events.length} mốc</Badge>
              </header>
              <div className="divide-y divide-[var(--line)]">{events.map((event, index) => <ScheduleEventRow event={event} key={`${event.d}-${event.h}-${event.c}-${index}`} />)}</div>
            </Card>
          )) : (
            <Card className="p-6 text-center" variant="solid"><Icon className="mx-auto h-8 w-8 text-[var(--text-muted)]" name="search" /><h3 className="mt-3 text-lg font-semibold">Không có mốc phù hợp</h3><p className="mt-1 text-sm text-[var(--text-muted)]">Thử đổi từ khóa hoặc bộ lọc.</p></Card>
          )}
        </section>
      </div>

      <p className="px-1 text-sm leading-5 text-[var(--text-muted)]">
        Nguồn: “Đính kèm 03 - Tiến độ dừng và khởi động Nhà máy”. Nội dung trên web đã được rút gọn; công việc chi tiết và quan hệ trước-sau xem trong tài liệu gốc.
      </p>
    </div>
  );
};
