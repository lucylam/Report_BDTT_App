"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CompanyBrand } from "@/components/CompanyBrand";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import {
  MobileAppHeader,
  MobileBottomNavigation
} from "@/components/MobileAppChrome";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Alert,
  AppLoadingState,
  Badge,
  Button,
  EmptyState,
  Field,
  Icon,
  type IconName,
  Input,
  PageHeader,
  Select,
  Textarea,
  Widget,
  WidgetHeader
} from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";
import { useAmData } from "@/hooks/useAmData";
import {
  type AmActivity,
  type AmActivityStatus,
  type AmEvent,
  type AmPerson,
  type AmPhoto,
  getAmActivityKpis,
  getAmStatusMeta,
  getAssigneeNames
} from "@/lib/amActivity";
import { getAmAssigneeOptions } from "@/lib/amPersonnel";
import { downloadAmReportWorkbook } from "@/lib/amXlsxExport";
import { formatViDate } from "@/lib/date";
import { compressPhotoToDataUrl, MAX_SOURCE_PHOTO_MEGABYTES } from "@/lib/photo";
import { cn } from "@/lib/ui";

type AmView = "assign" | "work" | "report" | "team";

const amViewIcons: Readonly<Record<AmView, IconName>> = {
  assign: "list",
  work: "camera",
  report: "chart",
  team: "people"
};
type PhotoKind = "before" | "after";
type ReportStatusFilter = "all" | "active" | AmActivityStatus;
type ReportDateFilter = "all" | "overdue" | "today" | "next7";

interface ReportFilterState {
  readonly search: string;
  readonly status: ReportStatusFilter;
  readonly assigneeId: string;
  readonly date: ReportDateFilter;
}

const INITIAL_REPORT_FILTERS: ReportFilterState = {
  search: "",
  status: "all",
  assigneeId: "all",
  date: "all"
};

interface AssignmentFormState {
  readonly requestContent: string;
  readonly locationTag: string;
  readonly scheduledDate: string;
  readonly assigneeIds: readonly string[];
}

interface PreviewPhoto {
  readonly src: string;
  readonly title: string;
}

const MAX_PHOTOS_PER_SIDE = 4;

const getTodayInputValue = (): string => {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60_000;
  return new Date(localTime).toISOString().slice(0, 10);
};

const initialAssignmentForm = (): AssignmentFormState => ({
  requestContent: "",
  locationTag: "",
  scheduledDate: getTodayInputValue(),
  assigneeIds: []
});

interface AssigneePickerProps {
  readonly options: readonly AmPerson[];
  readonly selectedIds: readonly string[];
  readonly onClear: () => void;
  readonly onToggle: (profileId: string) => void;
}

const AssigneePicker = ({
  options,
  selectedIds,
  onClear,
  onToggle
}: AssigneePickerProps): React.ReactElement => {
  const selectedNames = options
    .filter((person) => selectedIds.includes(person.id))
    .map((person) => person.fullName);
  const summary = selectedNames.length > 0
    ? selectedNames.join(", ")
    : "Chọn nhân sự";

  return (
    <div>
      <p className="text-sm font-semibold">Nhân sự thực hiện</p>
      <details className="group relative mt-2">
        <summary
          aria-label={`Nhân sự thực hiện: ${summary}`}
          className="focus-ring control-pill flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-field)] px-4 text-base font-semibold [&::-webkit-details-marker]:hidden"
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              selectedNames.length === 0 && "text-[var(--text-muted)]"
            )}
          >
            {summary}
          </span>
          {selectedNames.length > 0 ? (
            <span className="shrink-0 text-xs text-[var(--text-muted)]">
              {selectedNames.length} người
            </span>
          ) : null}
          <Icon
            className="h-4 w-4 transition-transform duration-150 group-open:rotate-180"
            name="chevronDown"
          />
        </summary>

        <div className="mt-2 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft-sm)]">
          <div className="flex min-h-10 items-center justify-between gap-3 px-2">
            <p aria-live="polite" className="text-xs font-semibold text-[var(--text-muted)]">
              Đã chọn {selectedNames.length} người
            </p>
            {selectedNames.length > 0 ? (
              <Button onClick={onClear} size="sm" variant="ghost">
                Bỏ chọn
              </Button>
            ) : null}
          </div>
          <div className="space-y-1">
            {options.map((person) => (
              <label
                className="focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[rgba(111,165,31,0.35)] flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-field)] px-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                key={person.id}
              >
                <input
                  checked={selectedIds.includes(person.id)}
                  className="h-5 w-5 accent-[var(--primary-strong)]"
                  onChange={() => onToggle(person.id)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1 truncate">{person.fullName}</span>
              </label>
            ))}
          </div>
          {options.length !== 4 ? (
            <p className="px-2 py-3 text-sm text-[var(--danger)]">
              Không tìm thấy 4 tài khoản nhân sự AM đã cấu hình.
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
};

const formatSafeDate = (dateText: string): string => {
  try {
    return formatViDate(dateText);
  } catch {
    return dateText;
  }
};

const sortActivities = (activities: readonly AmActivity[]): AmActivity[] =>
  [...activities].sort((left, right) => {
    const dateCompare = right.scheduledDate.localeCompare(left.scheduledDate);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });

const getEventLabel = (event: AmEvent): string => {
  if (event.eventType === "created" || event.eventType === "assigned") return "Tạo và giao nhiệm vụ";
  if (event.eventType === "report_updated") return "Cập nhật nội dung báo cáo";
  if (event.eventType === "photo_uploaded" || event.eventType === "photo_added") return "Thêm ảnh hiện trường";
  if (event.eventType === "photo_removed") return "Xóa ảnh hiện trường";
  if (event.eventType === "submitted") return "Gửi báo cáo chờ duyệt";
  if (event.eventType === "approved") return "Duyệt hoàn thành";
  if (event.eventType === "needs_revision") return "Yêu cầu bổ sung";
  if (event.eventType === "reassigned") return "Phân công lại nhân sự";
  return event.eventType.replaceAll("_", " ");
};

const ActivityTimeline = ({ events }: { readonly events: readonly AmEvent[] }): React.ReactElement => (
  <details className="mt-4 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
    <summary className="focus-ring cursor-pointer rounded text-sm font-medium text-[var(--foreground)]">
      Nhật ký công việc ({events.length})
    </summary>
    {events.length > 0 ? (
      <ol className="mt-3 space-y-3 border-l border-[var(--border-strong)] pl-4">
        {events.map((event) => (
          <li className="relative" key={event.id}>
            <span className="absolute -left-[1.22rem] top-1.5 h-2 w-2 rounded-full bg-[var(--primary-strong)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">{getEventLabel(event)}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {event.actorName} · {new Date(event.createdAt).toLocaleString("vi-VN")}
            </p>
          </li>
        ))}
      </ol>
    ) : (
      <p className="mt-3 text-sm text-[var(--text-muted)]">Chưa có sự kiện được ghi nhận.</p>
    )}
  </details>
);

interface PhotoStripProps {
  readonly title: string;
  readonly photos: readonly AmPhoto[];
  readonly activityId: string;
  readonly kind: PhotoKind;
  readonly canEdit: boolean;
  readonly busy: boolean;
  readonly onAddPhoto: (activityId: string, kind: PhotoKind, file: File) => Promise<void>;
  readonly onPreviewPhoto: (photo: PreviewPhoto) => void;
  readonly onRemovePhoto: (activityId: string, photoId: string) => void;
}

const PhotoStrip = ({
  title,
  photos,
  activityId,
  kind,
  canEdit,
  busy,
  onAddPhoto,
  onPreviewPhoto,
  onRemovePhoto
}: PhotoStripProps): React.ReactElement => {
  const baseInputId = `${activityId}-${kind}`;
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const availableSlots = Math.max(0, MAX_PHOTOS_PER_SIDE - photos.length);
    const files = Array.from(input.files ?? []).slice(0, availableSlots);
    for (const file of files) {
      await onAddPhoto(activityId, kind, file);
    }
    input.value = "";
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            {photos.length}/{MAX_PHOTOS_PER_SIDE} ảnh
          </p>
        </div>
      </div>

      <div className="mobile-action-grid mt-3 grid grid-cols-2 gap-2">
        <label
          aria-disabled={!canEdit || busy}
          className={cn(
            "focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[rgba(111,165,31,0.35)]",
            "pressable inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--foreground)]",
            (!canEdit || busy) && "pointer-events-none opacity-50"
          )}
          htmlFor={`${baseInputId}-choose`}
        >
          <Icon className="h-4 w-4" name="upload" />
          Chọn ảnh
          <input
            accept="image/*"
            className="sr-only"
            disabled={!canEdit || busy}
            id={`${baseInputId}-choose`}
            multiple
            onChange={handleFileChange}
            type="file"
          />
        </label>

        <label
          aria-disabled={!canEdit || busy}
          className={cn(
            "focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[rgba(111,165,31,0.35)]",
            "pressable inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--foreground)]",
            (!canEdit || busy) && "pointer-events-none opacity-50"
          )}
          htmlFor={`${baseInputId}-camera`}
        >
          <Icon className="h-4 w-4" name="upload" />
          Chụp ảnh
          <input
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={!canEdit || busy}
            id={`${baseInputId}-camera`}
            onChange={handleFileChange}
            type="file"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Ảnh nguồn tối đa {MAX_SOURCE_PHOTO_MEGABYTES}MB; hệ thống tự tối ưu trước khi tải lên.
      </p>

      {photos.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {photos.map((photo, index) => (
            <figure
              className="relative overflow-hidden rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)]"
              key={photo.id}
            >
              <button
                aria-label={`Xem ${title.toLowerCase()} ${index + 1}`}
                className="focus-ring group block w-full"
                onClick={() => onPreviewPhoto({ src: photo.url, title: `${title} ${index + 1}` })}
                type="button"
              >
                <Image
                  alt={`${title} ${index + 1}`}
                  className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  height={180}
                  src={photo.url}
                  unoptimized
                  width={240}
                />
                <span className="absolute inset-x-2 bottom-2 rounded-[var(--radius-field)] bg-black/70 px-2 py-1 text-center text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Xem ảnh
                </span>
              </button>
              {canEdit ? (
                <button
                  aria-label={`Xóa ${title.toLowerCase()} ${index + 1}`}
                  className="focus-ring pressable absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-field)] bg-[var(--surface)] text-[var(--danger)]"
                  onClick={() => onRemovePhoto(activityId, photo.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" name="close" />
                </button>
              ) : null}
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex min-h-24 items-center justify-center rounded-[var(--radius-field)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-3 text-center text-xs font-medium text-[var(--text-soft)]">
          Chưa có ảnh
        </div>
      )}
    </div>
  );
};

interface ActivityCardProps {
  readonly activity: AmActivity;
  readonly profiles: readonly AmPerson[];
  readonly canEditReport: boolean;
  readonly noteValue: string;
  readonly photoBusyKey: string | null;
  readonly onAddPhoto: (activityId: string, kind: PhotoKind, file: File) => Promise<void>;
  readonly onRemovePhoto: (activityId: string, photoId: string) => void;
  readonly onNoteChange: (activityId: string, note: string) => void;
  readonly onNoteBlur: (activityId: string) => void;
  readonly onPreviewPhoto: (photo: PreviewPhoto) => void;
  readonly onSubmitReport: (activityId: string) => void;
}

const ActivityCard = ({
  activity,
  profiles,
  canEditReport,
  noteValue,
  photoBusyKey,
  onAddPhoto,
  onRemovePhoto,
  onNoteChange,
  onNoteBlur,
  onPreviewPhoto,
  onSubmitReport
}: ActivityCardProps): React.ReactElement => {
  const status = getAmStatusMeta(activity.status);
  const canSubmit =
    activity.status !== "approved" &&
    activity.beforePhotos.length > 0 &&
    activity.afterPhotos.length > 0;

  return (
    <article className="glass-card scroll-mt-24 rounded-[var(--radius-card)] p-3" id={`am-task-${activity.id}`}>
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge solid tone={status.tone}>{status.label}</Badge>
            <Badge tone="info">{formatSafeDate(activity.scheduledDate)}</Badge>
            {activity.locationTag ? <Badge tone="primary">{activity.locationTag}</Badge> : null}
          </div>
          <h3 className="mt-2 text-base font-semibold leading-5 text-[var(--foreground)]">
            {activity.requestContent}
          </h3>
          <p className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)]">
            {getAssigneeNames(profiles, activity.assigneeIds)}
          </p>
        </div>
        <Button
          disabled={!canEditReport || !canSubmit}
          onClick={() => onSubmitReport(activity.id)}
          size="sm"
          variant={canSubmit ? "primary" : "secondary"}
        >
          <Icon className="h-4 w-4" name="check" />
          Gửi báo cáo
        </Button>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-2">
        <PhotoStrip
          activityId={activity.id}
          busy={photoBusyKey === `${activity.id}:before`}
          canEdit={canEditReport}
          kind="before"
          onAddPhoto={onAddPhoto}
          onPreviewPhoto={onPreviewPhoto}
          onRemovePhoto={onRemovePhoto}
          photos={activity.beforePhotos}
          title="Ảnh trước thực hiện"
        />
        <PhotoStrip
          activityId={activity.id}
          busy={photoBusyKey === `${activity.id}:after`}
          canEdit={canEditReport}
          kind="after"
          onAddPhoto={onAddPhoto}
          onPreviewPhoto={onPreviewPhoto}
          onRemovePhoto={onRemovePhoto}
          photos={activity.afterPhotos}
          title="Ảnh sau khi thực hiện"
        />
      </div>

      <Field className="mt-4" label="Ghi chú báo cáo">
        <Textarea
          disabled={!canEditReport}
          onBlur={() => onNoteBlur(activity.id)}
          onChange={(event) => onNoteChange(activity.id, event.target.value)}
          placeholder="Nhập vật tư đã thay, vấn đề còn tồn tại, điều kiện hiện trường..."
          value={noteValue}
        />
      </Field>
      <ActivityTimeline events={activity.events} />
    </article>
  );
};

interface ReportActionsProps {
  readonly activity: AmActivity;
  readonly canReview: boolean;
  readonly canAssign: boolean;
  readonly assigneeOptions: readonly AmPerson[];
  readonly supervisorNote: string;
  readonly onSupervisorNoteChange: (activityId: string, note: string) => void;
  readonly onSetStatus: (activityId: string, status: "approved" | "needsRevision") => void;
  readonly onReassign: (activityId: string, assigneeIds: readonly string[]) => void;
}

const ReportActions = ({
  activity,
  canReview,
  canAssign,
  assigneeOptions,
  supervisorNote,
  onSupervisorNoteChange,
  onSetStatus,
  onReassign
}: ReportActionsProps): React.ReactElement => {
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([
    ...activity.assigneeIds
  ]);

  const toggleReassign = (profileId: string): void => {
    setSelectedAssigneeIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId]
    );
  };

  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">Kiểm tra báo cáo</h4>
        {activity.status === "submitted" ? (
          <Badge tone="info">Cần quyết định</Badge>
        ) : (
          <Badge tone="neutral">{getAmStatusMeta(activity.status).label}</Badge>
        )}
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        Đối chiếu nội dung, ảnh trước và ảnh sau trước khi phê duyệt.
      </p>

      {canReview ? (
        <Field className="mt-3" label="Nhận xét giám sát">
          <Textarea
            className="min-h-24 text-sm"
            onChange={(event) => onSupervisorNoteChange(activity.id, event.target.value)}
            placeholder="Nhập lý do nếu yêu cầu bổ sung"
            value={supervisorNote}
          />
        </Field>
      ) : activity.supervisorNote ? (
        <div className="mt-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3">
          <p className="text-xs font-semibold text-[var(--text-soft)]">Nhận xét giám sát</p>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">
            {activity.supervisorNote}
          </p>
        </div>
      ) : null}

      {canReview && activity.status === "submitted" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => onSetStatus(activity.id, "approved")} size="sm">
            <Icon className="h-4 w-4" name="check" />
            Duyệt báo cáo
          </Button>
          <Button
            onClick={() => onSetStatus(activity.id, "needsRevision")}
            size="sm"
            variant="secondary"
          >
            Yêu cầu bổ sung
          </Button>
        </div>
      ) : null}
      {canAssign && activity.status !== "approved" ? (
        <details className="mt-3 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] p-2">
          <summary className="focus-ring min-h-10 cursor-pointer rounded-[var(--radius-field)] px-2 py-2 text-xs font-semibold text-[var(--text-muted)]">
            Phân công lại
          </summary>
          <div className="mt-1 space-y-1">
            {assigneeOptions.map((person) => (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] px-2 text-xs font-semibold hover:bg-[var(--surface)]" key={person.id}>
                <input
                  checked={selectedAssigneeIds.includes(person.id)}
                  className="h-5 w-5 accent-[var(--primary-strong)]"
                  onChange={() => toggleReassign(person.id)}
                  type="checkbox"
                />
                <span>{person.fullName}</span>
              </label>
            ))}
          </div>
          <Button
            className="mt-2"
            disabled={selectedAssigneeIds.length === 0}
            onClick={() => onReassign(activity.id, selectedAssigneeIds)}
            size="sm"
            variant="secondary"
          >
            Lưu phân công
          </Button>
        </details>
      ) : null}
    </div>
  );
};

interface ReportPhotoButtonProps {
  readonly photo: AmPhoto;
  readonly title: string;
  readonly className?: string;
  readonly onPreviewPhoto: (photo: PreviewPhoto) => void;
}

const ReportPhotoButton = ({
  photo,
  title,
  className,
  onPreviewPhoto
}: ReportPhotoButtonProps): React.ReactElement => (
  <button
    aria-label={`Xem ${title.toLowerCase()}`}
    className={cn(
      "focus-ring group relative overflow-hidden rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)]",
      className
    )}
    onClick={() => onPreviewPhoto({ src: photo.url, title })}
    type="button"
  >
    <Image
      alt={title}
      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      height={120}
      src={photo.url}
      unoptimized
      width={160}
    />
    <span className="absolute inset-x-1 bottom-1 rounded-[var(--radius-field)] bg-black/70 px-2 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      Xem
    </span>
  </button>
);

interface ReportEvidenceGroupProps {
  readonly photos: readonly AmPhoto[];
  readonly title: string;
  readonly emptyText: string;
  readonly onPreviewPhoto: (photo: PreviewPhoto) => void;
}

const ReportEvidenceGroup = ({
  photos,
  title,
  emptyText,
  onPreviewPhoto
}: ReportEvidenceGroupProps): React.ReactElement => (
  <section className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-3">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-semibold text-[var(--foreground)]">{title}</h4>
      <Badge tone={photos.length > 0 ? "success" : "warning"}>
        {photos.length} ảnh
      </Badge>
    </div>
    {photos.length > 0 ? (
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
        {photos.slice(0, 4).map((photo, index) => (
          <ReportPhotoButton
            className="h-28 w-full sm:h-32"
            key={photo.id}
            onPreviewPhoto={onPreviewPhoto}
            photo={photo}
            title={`${title} ${index + 1}`}
          />
        ))}
      </div>
    ) : (
      <div className="mt-3 flex min-h-24 items-center justify-center rounded-[var(--radius-field)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 text-center text-xs font-medium text-[var(--text-soft)]">
        {emptyText}
      </div>
    )}
  </section>
);

interface ReportReviewCardProps {
  readonly activity: AmActivity;
  readonly index: number;
  readonly profiles: readonly AmPerson[];
  readonly canReview: boolean;
  readonly canAssign: boolean;
  readonly assigneeOptions: readonly AmPerson[];
  readonly supervisorNote: string;
  readonly onPreviewPhoto: (photo: PreviewPhoto) => void;
  readonly onSupervisorNoteChange: (activityId: string, note: string) => void;
  readonly onSetStatus: (activityId: string, status: "approved" | "needsRevision") => void;
  readonly onReassign: (activityId: string, assigneeIds: readonly string[]) => void;
}

const ReportReviewCard = ({
  activity,
  index,
  profiles,
  canReview,
  canAssign,
  assigneeOptions,
  supervisorNote,
  onPreviewPhoto,
  onSupervisorNoteChange,
  onSetStatus,
  onReassign
}: ReportReviewCardProps): React.ReactElement => {
  const status = getAmStatusMeta(activity.status);
  const evidenceComplete = activity.beforePhotos.length > 0 && activity.afterPhotos.length > 0;

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]">
      <details className="group">
        <summary className="focus-ring cursor-pointer list-none px-3 py-3 [&::-webkit-details-marker]:hidden sm:px-4">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.32fr)_150px_150px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-[var(--text-soft)]">
                  #{index + 1}
                </span>
                {activity.locationTag ? <Badge tone="primary">{activity.locationTag}</Badge> : null}
              </div>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-[var(--foreground)] sm:text-base">
                {activity.requestContent}
              </h3>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-soft)]">Người thực hiện</p>
              <p className="mt-1 truncate text-sm font-medium text-[var(--foreground)]">
                {getAssigneeNames(profiles, activity.assigneeIds)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-soft)]">Bằng chứng</p>
              <p className="mt-1 text-sm font-medium tabular-nums text-[var(--foreground)]">
                Trước {activity.beforePhotos.length} / Sau {activity.afterPhotos.length}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="text-left lg:text-right">
                <Badge solid tone={status.tone}>{status.label}</Badge>
                <p className="mt-1 text-xs font-medium tabular-nums text-[var(--text-muted)]">
                  {formatSafeDate(activity.scheduledDate)}
                </p>
              </div>
              <Icon
                className="h-4 w-4 text-[var(--text-soft)] transition-transform duration-150 group-open:rotate-180"
                name="chevronDown"
              />
            </div>
          </div>
        </summary>

        <div className="border-t border-[var(--line)] bg-[var(--surface-muted)] p-3 sm:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">Đối chiếu hiện trường</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      So sánh ảnh trước và sau để xác nhận kết quả thực hiện.
                    </p>
                  </div>
                  <Badge tone={evidenceComplete ? "success" : "warning"}>
                    {evidenceComplete ? "Đủ bằng chứng" : "Thiếu bằng chứng"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <ReportEvidenceGroup
                    emptyText="Chưa có ảnh trước thực hiện"
                    onPreviewPhoto={onPreviewPhoto}
                    photos={activity.beforePhotos}
                    title="Ảnh trước thực hiện"
                  />
                  <ReportEvidenceGroup
                    emptyText="Chưa có ảnh sau thực hiện"
                    onPreviewPhoto={onPreviewPhoto}
                    photos={activity.afterPhotos}
                    title="Ảnh sau thực hiện"
                  />
                </div>
              </div>

              <section className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-3">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">Nội dung báo cáo</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                  {activity.performerNote || "Người thực hiện chưa nhập ghi chú báo cáo."}
                </p>
              </section>

              <ActivityTimeline events={activity.events} />
            </div>

            <aside className="min-w-0">
              <ReportActions
                activity={activity}
                assigneeOptions={assigneeOptions}
                canAssign={canAssign}
                canReview={canReview}
                onReassign={onReassign}
                onSetStatus={onSetStatus}
                onSupervisorNoteChange={onSupervisorNoteChange}
                supervisorNote={supervisorNote}
              />
            </aside>
          </div>
        </div>
      </details>
    </article>
  );
};

interface PhotoLightboxProps {
  readonly photo: PreviewPhoto | null;
  readonly onClose: () => void;
}

const PhotoLightbox = ({ photo, onClose }: PhotoLightboxProps): React.ReactElement | null => {
  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, photo]);

  if (!photo) return null;

  return (
    <div
      aria-label="Xem ảnh đính kèm"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-[var(--radius-card)] border border-white/20 bg-[var(--surface)] shadow-[var(--shadow-floating)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--line)] px-4">
          <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
            {photo.title}
          </h2>
          <button
            aria-label="Đóng ảnh"
            className="focus-ring pressable inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-field)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="flex max-h-[calc(92dvh-3.5rem)] items-center justify-center overflow-auto bg-black p-2">
          <Image
            alt={photo.title}
            className="max-h-[calc(92dvh-5rem)] w-auto max-w-full object-contain"
            height={900}
            src={photo.src}
            unoptimized
            width={1200}
          />
        </div>
      </div>
    </div>
  );
};

const AmPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout } = useAppData();
  const am = useAmData();
  const [activeView, setActiveView] = useState<AmView>("assign");
  const [form, setForm] = useState<AssignmentFormState>(() => initialAssignmentForm());
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoBusyKey, setPhotoBusyKey] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhoto | null>(null);
  const [performerNotes, setPerformerNotes] = useState<Record<string, string>>({});
  const [supervisorNotes, setSupervisorNotes] = useState<Record<string, string>>({});
  const [reportFilters, setReportFilters] = useState<ReportFilterState>(INITIAL_REPORT_FILTERS);
  const [teamSelection, setTeamSelection] = useState<string[] | null>(null);
  const [linkedTaskId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("task")?.trim() ?? ""
  );
  const bdttHref = currentAccount?.role === "admin" ? "/admin" : "/worker";

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  useEffect(() => {
    if (!linkedTaskId || am.loading) return;
    if (!am.activities.some((activity) => activity.id === linkedTaskId)) return;
    const timerId = window.setTimeout(() => {
      setActiveView("work");
      window.requestAnimationFrame(() => {
        document.getElementById(`am-task-${linkedTaskId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    }, 80);
    return () => window.clearTimeout(timerId);
  }, [am.activities, am.loading, linkedTaskId]);

  const currentView: AmView =
    (!am.permissions.canAssign && activeView === "assign") ||
    (!am.permissions.canManageTeam && activeView === "team")
      ? "work"
      : activeView;
  const assigneeOptions = useMemo(
    () => getAmAssigneeOptions(am.people),
    [am.people]
  );
  const teamCandidates = useMemo(
    () =>
      am.people.filter(
        (person) =>
          person.amRole !== "leader" &&
          person.amRole !== "workshop_manager" &&
          person.amRole !== "web_admin"
      ),
    [am.people]
  );
  const defaultTeamMemberIds = useMemo(
    () => am.people.filter((person) => person.amRole === "member").map((person) => person.id),
    [am.people]
  );
  const selectedTeamMemberIds = teamSelection ?? defaultTeamMemberIds;
  const visibleActivities = useMemo(() => sortActivities(am.activities), [am.activities]);
  const myActivities = visibleActivities;
  const reportActivities = visibleActivities;
  const kpis = useMemo(() => getAmActivityKpis(reportActivities), [reportActivities]);
  const filteredReportActivities = useMemo(() => {
    const searchTerm = reportFilters.search.trim().toLocaleLowerCase("vi");
    const today = getTodayInputValue();
    const nextWeek = new Date(`${today}T00:00:00`);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekValue = new Date(
      nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60_000
    ).toISOString().slice(0, 10);

    return reportActivities.filter((activity) => {
      const statusMatches =
        reportFilters.status === "all" ||
        (reportFilters.status === "active"
          ? activity.status === "assigned" || activity.status === "inProgress"
          : activity.status === reportFilters.status);
      const assigneeMatches =
        reportFilters.assigneeId === "all" ||
        activity.assigneeIds.includes(reportFilters.assigneeId);
      const dateMatches =
        reportFilters.date === "all" ||
        (reportFilters.date === "today" && activity.scheduledDate === today) ||
        (reportFilters.date === "overdue" &&
          activity.status !== "approved" &&
          activity.scheduledDate < today) ||
        (reportFilters.date === "next7" &&
          activity.scheduledDate >= today &&
          activity.scheduledDate <= nextWeekValue);
      const assigneeNames = getAssigneeNames(am.people, activity.assigneeIds);
      const searchMatches =
        !searchTerm ||
        [activity.requestContent, activity.locationTag, assigneeNames]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(searchTerm);

      return statusMatches && assigneeMatches && dateMatches && searchMatches;
    });
  }, [am.people, reportActivities, reportFilters]);
  const hasReportFilters =
    reportFilters.search.trim().length > 0 ||
    reportFilters.status !== "all" ||
    reportFilters.assigneeId !== "all" ||
    reportFilters.date !== "all";

  const toggleAssignee = (profileId: string): void => {
    setForm((current) => {
      const selected = current.assigneeIds.includes(profileId);
      return {
        ...current,
        assigneeIds: selected
          ? current.assigneeIds.filter((id) => id !== profileId)
          : [...current.assigneeIds, profileId]
      };
    });
  };

  const handleCreateAssignment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError("");
    setFeedback("");
    const requestContent = form.requestContent.trim();
    const scheduledDate = form.scheduledDate.trim();

    if (!requestContent) {
      setFormError("Cần nhập nội dung yêu cầu.");
      return;
    }
    if (!scheduledDate) {
      setFormError("Cần chọn ngày thực hiện.");
      return;
    }
    if (form.assigneeIds.length === 0) {
      setFormError("Cần chọn ít nhất một nhân sự thực hiện.");
      return;
    }
    try {
      await am.createTask({
        requestContent,
        locationTag: form.locationTag,
        assigneeIds: form.assigneeIds,
        scheduledDate
      });
      setForm(initialAssignmentForm());
      setFeedback("Đã tạo nhiệm vụ AM và gửi thông báo cho người thực hiện.");
      setActiveView("work");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không giao được nhiệm vụ AM.");
    }
  };

  const handleAddPhoto = async (
    activityId: string,
    kind: PhotoKind,
    file: File
  ): Promise<void> => {
    setPhotoError("");
    setFeedback("");
    const activity = am.activities.find((item) => item.id === activityId);
    const currentPhotos = kind === "before" ? activity?.beforePhotos : activity?.afterPhotos;
    if ((currentPhotos?.length ?? 0) >= MAX_PHOTOS_PER_SIDE) {
      setPhotoError(`Mỗi nhóm ảnh chỉ nhận tối đa ${MAX_PHOTOS_PER_SIDE} ảnh.`);
      return;
    }

    setPhotoBusyKey(`${activityId}:${kind}`);
    try {
      const photo = await compressPhotoToDataUrl(file);
      await am.uploadPhoto(activityId, kind, photo);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không xử lý được ảnh.");
    } finally {
      setPhotoBusyKey(null);
    }
  };

  const handleRemovePhoto = async (activityId: string, photoId: string): Promise<void> => {
    setPhotoError("");
    try {
      await am.removePhoto(activityId, photoId);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không xóa được ảnh.");
    }
  };

  const handlePerformerNoteChange = (activityId: string, note: string): void => {
    setPerformerNotes((current) => ({ ...current, [activityId]: note }));
  };

  const handlePerformerNoteBlur = async (activityId: string): Promise<void> => {
    const activity = am.activities.find((item) => item.id === activityId);
    const note = performerNotes[activityId];
    if (!activity || note === undefined || note === activity.performerNote) return;
    try {
      await am.updateReport(activityId, note);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không lưu được ghi chú.");
    }
  };

  const handleSupervisorNoteChange = (activityId: string, note: string): void => {
    setSupervisorNotes((current) => ({ ...current, [activityId]: note }));
  };

  const handleSubmitReport = async (activityId: string): Promise<void> => {
    setFeedback("");
    setPhotoError("");
    const activity = am.activities.find((item) => item.id === activityId);
    if (!activity) return;
    if (activity.beforePhotos.length === 0 || activity.afterPhotos.length === 0) {
      setPhotoError("Cần có ít nhất một ảnh trước và một ảnh sau khi gửi báo cáo.");
      return;
    }

    try {
      const note = performerNotes[activityId];
      if (note !== undefined && note !== activity.performerNote) {
        await am.updateReport(activityId, note);
      }
      await am.submitReport(activityId);
      setFeedback("Đã gửi báo cáo AM và thông báo cho Tổ trưởng/giám sát.");
      setActiveView("report");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không gửi được báo cáo AM.");
    }
  };

  const handleSetStatus = (
    activityId: string,
    status: "approved" | "needsRevision"
  ): Promise<void> => {
    const activity = am.activities.find((item) => item.id === activityId);
    const note = supervisorNotes[activityId] ?? activity?.supervisorNote ?? "";
    return am.reviewReport(activityId, status, note).then(() => {
      setFeedback(status === "approved" ? "Đã duyệt báo cáo AM." : "Đã yêu cầu bổ sung báo cáo.");
    }).catch((error: unknown) => {
      setPhotoError(error instanceof Error ? error.message : "Không cập nhật được kết quả duyệt.");
    });
  };

  const handleReassign = async (
    activityId: string,
    assigneeIds: readonly string[]
  ): Promise<void> => {
    try {
      await am.reassignTask(activityId, assigneeIds);
      setFeedback("Đã cập nhật phân công và gửi thông báo.");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không phân công lại được.");
    }
  };

  const handleSaveTeam = async (): Promise<void> => {
    try {
      await am.updateTeam(selectedTeamMemberIds);
      setTeamSelection(null);
      setFeedback("Đã cập nhật danh sách Tổ AM.");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không cập nhật được danh sách Tổ AM.");
    }
  };

  const toggleTeamMember = (profileId: string): void => {
    setTeamSelection((current) => {
      const base = current ?? defaultTeamMemberIds;
      return base.includes(profileId)
        ? base.filter((id) => id !== profileId)
        : [...base, profileId];
    });
  };

  const handleDownloadReport = async (
    activities: readonly AmActivity[] = reportActivities
  ): Promise<void> => {
    try {
      await downloadAmReportWorkbook(activities, am.people);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Không xuất được báo cáo Excel.");
    }
  };

  const availableViews: readonly { readonly key: AmView; readonly label: string }[] = [
        ...(am.permissions.canAssign ? [{ key: "assign" as const, label: "Giao việc" }] : []),
        { key: "work", label: "Cập nhật" },
        { key: "report", label: "Báo cáo" },
        ...(am.permissions.canManageTeam ? [{ key: "team" as const, label: "Tổ AM" }] : [])
      ];

  if (!data || !currentAccount || currentAccount.mustChangePassword) {
    return (
      <AppLoadingState
        description="Đang kiểm tra phiên đăng nhập và dữ liệu tổ AM."
        icon="settings"
        title="Đang chuẩn bị công tác AM"
      />
    );
  }

  return (
    <main className="mobile-native-page am-mobile-page min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] pt-2 sm:px-3 sm:pt-3 lg:p-3 2xl:p-4">
      <div className="app-shell mobile-native-shell desktop-shell-grid mx-auto grid min-h-[calc(100dvh-1rem)] w-full max-w-none overflow-hidden rounded-[var(--radius-panel)] lg:min-h-[calc(100dvh-1.5rem)] 2xl:min-h-[calc(100dvh-2rem)]">
        <aside className="desktop-sidebar-safe hidden border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:flex lg:flex-col">
          <Link className="focus-ring rounded-[var(--radius-card)] p-1" href="/">
            <CompanyBrand variant="sidebar" />
          </Link>
          <ModuleSwitcher activeModule="am" bdttHref={bdttHref} className="mt-4" compact />

          <div className="mt-4 flex-1 border-t border-[var(--line)] pt-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">Quy trình AM</p>
            <div className="mt-2 space-y-1.5 text-xs font-medium leading-5 text-[var(--text-muted)]">
              <p>1. Giao nội dung, nhân sự, ngày thực hiện</p>
              <p>2. Người thực hiện chụp ảnh trước và sau</p>
              <p>3. Giám sát duyệt hoặc yêu cầu bổ sung</p>
              <p>4. Xuất báo cáo tổng hợp</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <MobileAppHeader
            account={currentAccount}
            accountStatusLabel="Phiên nội bộ"
            activeModule="am"
            bdttHref={bdttHref}
            onLogout={logout}
            title="AM"
          />
          <header className="hidden px-5 py-5 lg:block">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
              <PageHeader
                className="min-w-0 flex-1"
                description="Giao việc AM, cập nhật ảnh trước/sau và tổng hợp báo cáo thay cho thao tác copy từ Zalo sang Excel."
                eyebrow="Công tác AM"
                title="Giao nhiệm vụ và báo cáo AM"
              />

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <GlobalNotifications />
                <ThemeToggle />
                <AccountMenu
                  account={currentAccount}
                  onLogout={logout}
                  statusLabel="Phiên nội bộ"
                />
              </div>
            </div>
          </header>

          <div className="min-w-0 space-y-4 px-4 py-4 lg:px-5 lg:pb-6 lg:pt-0">
            {currentView !== "report" ? (
              <section className="mobile-kpi-strip grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] lg:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Tổng việc", kpis.total],
                  ["Đã giao", kpis.assigned],
                  ["Đang làm", kpis.inProgress],
                  ["Chờ duyệt", kpis.submitted],
                  ["Bổ sung", kpis.needsRevision],
                  ["Đã đạt", kpis.approved]
                ].map(([label, value]) => (
                  <div className="flex min-h-12 items-center justify-between gap-2 border-b border-r border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 lg:block lg:min-h-0 lg:py-2.5" key={label}>
                    <p className="text-[11px] font-medium leading-4 text-[var(--text-muted)] lg:uppercase lg:text-[var(--text-soft)]">{label}</p>
                    <p className="text-lg font-semibold tabular-nums text-[var(--foreground)] lg:mt-1 lg:text-xl">
                      {value}
                    </p>
                  </div>
                ))}
              </section>
            ) : null}

            <nav
              aria-label="Chức năng AM"
              className="hidden max-w-full overflow-x-auto border-b border-[var(--line)] lg:flex"
            >
              {availableViews.map((view) => (
                <button
                  aria-current={currentView === view.key ? "page" : undefined}
                  className={cn(
                    "focus-ring min-h-10 shrink-0 border-b-2 px-4 text-sm font-semibold",
                    currentView === view.key
                      ? "border-[var(--primary)] text-[var(--primary-strong)]"
                      : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  )}
                  key={view.key}
                  onClick={() => setActiveView(view.key)}
                  type="button"
                >
                  {view.label}
                </button>
              ))}
            </nav>

            {feedback ? <Alert tone="success">{feedback}</Alert> : null}
            {photoError ? <Alert tone="danger">{photoError}</Alert> : null}
            {am.error ? <Alert tone="danger">{am.error}</Alert> : null}
            {am.loading ? <Alert tone="info">Đang tải dữ liệu AM từ Supabase...</Alert> : null}

            {currentView === "assign" && am.permissions.canAssign ? (
              <Widget>
                <WidgetHeader
                  icon="list"
                  subtitle="Tạo việc từ nội dung đang giao qua Zalo, sau đó theo dõi ảnh bằng chứng ngay trong web."
                  title="Giao nhiệm vụ AM"
                />
                <form className="space-y-3" onSubmit={handleCreateAssignment}>
                  <Field label="Nội dung yêu cầu">
                    <Textarea
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          requestContent: event.target.value
                        }))
                      }
                      placeholder="Ví dụ: Máng cáp dây tín hiệu vào PT 7013 lỏng lẻo"
                      required
                      value={form.requestContent}
                    />
                  </Field>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Tag / khu vực">
                      <Input
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            locationTag: event.target.value
                          }))
                        }
                        placeholder="Ví dụ: AMO, PT7013, LT3041"
                        value={form.locationTag}
                      />
                    </Field>
                    <Field label="Ngày thực hiện">
                      <Input
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            scheduledDate: event.target.value
                          }))
                        }
                        required
                        type="date"
                        value={form.scheduledDate}
                      />
                    </Field>
                    <AssigneePicker
                      onClear={() =>
                        setForm((current) => ({ ...current, assigneeIds: [] }))
                      }
                      onToggle={toggleAssignee}
                      options={assigneeOptions}
                      selectedIds={form.assigneeIds}
                    />
                  </div>
                  {formError ? (
                    <p role="alert" className="text-sm font-semibold text-[var(--danger)]">
                      {formError}
                    </p>
                  ) : null}
                  <Button className="w-full sm:w-auto" type="submit">
                    <Icon name="check" />
                    Giao nhiệm vụ
                  </Button>
                </form>
              </Widget>
            ) : null}

            {currentView === "team" && am.permissions.canManageTeam ? (
              <Widget>
                <WidgetHeader
                  icon="people"
                  tone="info"
                  subtitle="Danh sách cố định do Tổ trưởng AM quản lý. Cần phân công lại task đang mở trước khi rút một thành viên."
                  title="Thiết lập thành viên Tổ AM"
                />
                <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                  {teamCandidates.map((person) => (
                    <label
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] px-3 lg:min-h-10"
                      key={person.id}
                    >
                      <input
                        checked={selectedTeamMemberIds.includes(person.id)}
                        className="h-5 w-5 accent-[var(--primary-strong)]"
                        onChange={() => toggleTeamMember(person.id)}
                        type="checkbox"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{person.fullName}</span>
                        <span className="block truncate text-xs font-medium text-[var(--text-muted)]">@{person.username} · {person.orgTitle}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button disabled={am.busy} onClick={() => void handleSaveTeam()}>
                    <Icon name="check" />
                    Lưu danh sách ({selectedTeamMemberIds.length})
                  </Button>
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    Tổ trưởng: Nguyễn Thanh Hải (@haint)
                  </p>
                </div>
              </Widget>
            ) : null}

            {currentView === "work" ? (
              <section className="space-y-3">
                {myActivities.length > 0 ? (
                  myActivities.map((activity) => (
                    <ActivityCard
                      activity={activity}
                      canEditReport={
                        (activity.status === "assigned" ||
                          activity.status === "inProgress" ||
                          activity.status === "needsRevision") &&
                        activity.assigneeIds.includes(am.actorProfileId)
                      }
                      key={activity.id}
                      noteValue={performerNotes[activity.id] ?? activity.performerNote}
                      onAddPhoto={handleAddPhoto}
                      onNoteBlur={handlePerformerNoteBlur}
                      onNoteChange={handlePerformerNoteChange}
                      onPreviewPhoto={setPreviewPhoto}
                      onRemovePhoto={handleRemovePhoto}
                      onSubmitReport={handleSubmitReport}
                      photoBusyKey={photoBusyKey}
                      profiles={am.people}
                    />
                  ))
                ) : (
                  <EmptyState
                    description="Nhiệm vụ mới sẽ xuất hiện tại đây."
                    title="Chưa có nhiệm vụ AM"
                  />
                )}
              </section>
            ) : null}

            {currentView === "report" ? (
              <Widget>
                <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      Báo cáo và phê duyệt AM
                    </h2>
                    <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-[var(--text-muted)] lg:block">
                      Lọc công việc cần chú ý, mở từng nhiệm vụ để đối chiếu ảnh trước và sau, sau đó duyệt hoặc yêu cầu bổ sung.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      disabled={filteredReportActivities.length === 0}
                      onClick={() => void handleDownloadReport(filteredReportActivities)}
                      size="sm"
                      variant="secondary"
                    >
                      <Icon className="h-4 w-4" name="download" />
                      Xuất XLSX
                    </Button>
                    <Button
                      disabled={filteredReportActivities.length === 0}
                      onClick={() => window.print()}
                      size="sm"
                      variant="secondary"
                    >
                      <Icon className="h-4 w-4" name="spreadsheet" />
                      In
                    </Button>
                  </div>
                </div>

                <section aria-label="Lọc nhanh theo trạng thái" className="mobile-adaptive-grid mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
                  {[
                    { key: "all" as const, label: "Tất cả", value: kpis.total, tone: "neutral" as const },
                    {
                      key: "active" as const,
                      label: "Đang thực hiện",
                      value: kpis.assigned + kpis.inProgress,
                      tone: "accent" as const
                    },
                    { key: "submitted" as const, label: "Chờ duyệt", value: kpis.submitted, tone: "info" as const },
                    { key: "needsRevision" as const, label: "Cần bổ sung", value: kpis.needsRevision, tone: "warning" as const },
                    { key: "approved" as const, label: "Đã duyệt", value: kpis.approved, tone: "success" as const }
                  ].map((item) => (
                    <button
                      aria-pressed={reportFilters.status === item.key}
                      className={cn(
                        "focus-ring pressable min-h-20 rounded-[var(--radius-field)] border px-3 py-2 text-left",
                        reportFilters.status === item.key
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                      )}
                      key={item.key}
                      onClick={() =>
                        setReportFilters((current) => ({ ...current, status: item.key }))
                      }
                      type="button"
                    >
                      <span className="block text-xl font-semibold tabular-nums text-[var(--foreground)]">
                        {item.value}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
                        {item.label}
                        <Badge tone={item.tone}>{item.value}</Badge>
                      </span>
                    </button>
                  ))}
                </section>

                <section className="mt-4 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3" aria-label="Bộ lọc báo cáo">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.2fr)_repeat(3,minmax(170px,0.6fr))]">
                    <Field label="Tìm nhiệm vụ">
                      <Input
                        onChange={(event) =>
                          setReportFilters((current) => ({ ...current, search: event.target.value }))
                        }
                        placeholder="Nội dung, tag hoặc nhân sự"
                        type="search"
                        value={reportFilters.search}
                      />
                    </Field>
                    <Field label="Trạng thái">
                      <Select
                        onChange={(event) =>
                          setReportFilters((current) => ({
                            ...current,
                            status: event.target.value as ReportStatusFilter
                          }))
                        }
                        value={reportFilters.status}
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang thực hiện</option>
                        <option value="submitted">Chờ duyệt</option>
                        <option value="needsRevision">Cần bổ sung</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="assigned">Đã giao</option>
                        <option value="inProgress">Đang làm</option>
                      </Select>
                    </Field>
                    <Field label="Nhân sự">
                      <Select
                        onChange={(event) =>
                          setReportFilters((current) => ({
                            ...current,
                            assigneeId: event.target.value
                          }))
                        }
                        value={reportFilters.assigneeId}
                      >
                        <option value="all">Tất cả nhân sự</option>
                        {assigneeOptions.map((person) => (
                          <option key={person.id} value={person.id}>{person.fullName}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Thời hạn">
                      <Select
                        onChange={(event) =>
                          setReportFilters((current) => ({
                            ...current,
                            date: event.target.value as ReportDateFilter
                          }))
                        }
                        value={reportFilters.date}
                      >
                        <option value="all">Tất cả ngày</option>
                        <option value="overdue">Quá hạn chưa duyệt</option>
                        <option value="today">Thực hiện hôm nay</option>
                        <option value="next7">Trong 7 ngày tới</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
                    <p aria-live="polite" className="text-sm font-medium text-[var(--text-muted)]">
                      Hiển thị <strong className="text-[var(--foreground)]">{filteredReportActivities.length}</strong>/{reportActivities.length} nhiệm vụ
                    </p>
                    {hasReportFilters ? (
                      <Button
                        onClick={() => setReportFilters(INITIAL_REPORT_FILTERS)}
                        size="sm"
                        variant="ghost"
                      >
                        Xóa bộ lọc
                      </Button>
                    ) : null}
                  </div>
                </section>

                {filteredReportActivities.length > 0 ? (
                  <>
                    <div className="mt-4 space-y-2">
                      {filteredReportActivities.map((activity, index) => (
                        <ReportReviewCard
                          activity={activity}
                          assigneeOptions={assigneeOptions}
                          canAssign={am.permissions.canAssign}
                          canReview={am.permissions.canReview}
                          index={index}
                          key={activity.id}
                          onPreviewPhoto={setPreviewPhoto}
                          onReassign={handleReassign}
                          onSetStatus={handleSetStatus}
                          onSupervisorNoteChange={handleSupervisorNoteChange}
                          profiles={am.people}
                          supervisorNote={supervisorNotes[activity.id] ?? activity.supervisorNote}
                        />
                      ))}
                    </div>

                  </>
                ) : (
                  <EmptyState
                    action={
                      hasReportFilters ? (
                        <Button
                          onClick={() => setReportFilters(INITIAL_REPORT_FILTERS)}
                          size="sm"
                          variant="secondary"
                        >
                          Xóa bộ lọc
                        </Button>
                      ) : undefined
                    }
                    description={
                      reportActivities.length === 0
                        ? "Chưa có nhiệm vụ để tổng hợp."
                        : "Hãy điều chỉnh bộ lọc hiện tại."
                    }
                    title={reportActivities.length === 0 ? "Chưa có báo cáo" : "Không có kết quả"}
                  />
                )}
              </Widget>
            ) : null}
          </div>
        </section>
      </div>
      <MobileBottomNavigation
        ariaLabel="Điều hướng AM"
        items={availableViews.map((view) => ({
          active: currentView === view.key,
          icon: amViewIcons[view.key],
          key: view.key,
          label: view.label,
          onSelect: () => setActiveView(view.key)
        }))}
      />
      <PhotoLightbox photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </main>
  );
};

export default AmPage;
