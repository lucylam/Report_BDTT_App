"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Badge, Icon, Widget, WidgetHeader } from "@/components/ui";
import {
  getProgressLabel,
  getStatusLabel,
  getStatusTone,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";
import { getProgressPhotoPaths, resolvePhotoPreviewUrl } from "@/lib/photo";
import { LeaderTaskManager } from "@/components/admin/tasks/LeaderTaskManager";
import type { AppData } from "@/types/domain";

interface TaskDetailPanelProps {
  readonly row: TaskRow | null;
  readonly data: AppData;
  readonly canManage: boolean;
  readonly onDataChanged: () => Promise<void>;
}

export const TaskDetailPanel = ({
  row,
  data,
  canManage,
  onDataChanged
}: TaskDetailPanelProps): React.ReactElement => {
  const [photoPreviews, setPhotoPreviews] = useState<
    readonly { readonly source: string; readonly url: string }[]
  >([]);
  const photoPaths = useMemo(
    () => getProgressPhotoPaths(row?.progress),
    [row?.progress]
  );
  const visiblePhotoPreviews = photoPreviews.filter((preview) =>
    photoPaths.includes(preview.source)
  );

  useEffect(() => {
    let cancelled = false;
    if (photoPaths.length === 0) return;

    void Promise.all(
      photoPaths.map(async (source) => ({ source, url: await resolvePhotoPreviewUrl(source) }))
    )
      .then((previews) => {
        if (!cancelled) setPhotoPreviews(previews);
      })
      .catch((error: unknown) => {
        console.error("[TaskDetailPanel.resolvePhotoPreviewUrl]", error);
      });

    return () => {
      cancelled = true;
    };
  }, [photoPaths]);

  if (!row) {
    return (
      <Widget>
        <WidgetHeader
          icon="workorder"
          tone="info"
          subtitle="Chọn một dòng trong bảng để xem task, WO, resource, ghi chú và ảnh cập nhật."
          title="Chi tiết hạng mục"
        />
      </Widget>
    );
  }

  const { task, percent, progress, status } = row;

  return (
    <Widget className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-auto p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xl font-semibold leading-tight">{task.tagname}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--primary-strong)]">
            WO {task.wo || "N/A"}
          </p>
        </div>
        <Badge solid tone={task.isCancelled ? "danger" : getStatusTone(status)}>
          {getProgressLabel(task, percent)}
        </Badge>
      </div>

      <div className="mt-4 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-4 ring-1 ring-[var(--border)]">
        <p className="text-xs font-semibold uppercase text-[var(--text-soft)]">Hạng mục</p>
        <p className="mt-2 text-base font-semibold leading-6 text-[var(--foreground)]">
          {task.taskName || "Chưa có tên hạng mục"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Info label="Trạng thái" value={getStatusLabel(status)} />
        <Info label="Priority" value={`P${task.priority}`} />
        <Info label="Nhóm" value={task.nhom || "N/A"} />
        <Info label="Đơn vị" value={task.donVi || "N/A"} />
        <Info label="Section" value={task.section || "N/A"} />
        <Info label="Start Time" value={task.startDate || "N/A"} />
        <Info label="Finish Time" value={task.finishDate || "N/A"} />
        <Info label="Thời lượng" value={task.duration || "N/A"} />
      </div>

      <div className="mt-4 rounded-[var(--radius-field)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <p className="text-xs font-semibold uppercase text-[var(--text-soft)]">Resource</p>
        <p className="mt-2 text-sm font-semibold">{task.resourceName || "N/A"}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Nhóm trưởng: {task.nhomTruong || "N/A"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Info
          label="Người thực hiện"
          value={
            data.profiles.find((profile) => profile.id === task.assignedTo)?.fullName ||
            task.resourceName ||
            "N/A"
          }
        />
        <Info
          label="Người báo cáo"
          value={
            data.profiles.find((profile) => profile.id === task.reporterId)?.fullName ||
            "N/A"
          }
        />
      </div>

      {task.taskSource === "ad_hoc" ? (
        <p className="mt-4 rounded-[var(--radius-field)] bg-[var(--accent-soft)] px-4 py-3 text-xs font-semibold uppercase text-[var(--accent-strong)] ring-1 ring-[var(--border)]">
          Task phát sinh
        </p>
      ) : null}

      {task.isCancelled ? (
        <div className="mt-4 rounded-[var(--radius-field)] bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
          Lý do cancel: {task.cancelReason || "Chưa nhập lý do"}
        </div>
      ) : null}

      <div className="mt-4 rounded-[var(--radius-field)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-soft)]">
          <Icon className="h-4 w-4" name="history" />
          Ghi chú worker
        </p>
        <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--foreground)]">
          {progress?.note || "Chưa có ghi chú cho ngày báo cáo hiện tại."}
        </p>
        {progress?.submittedBy && progress.submittedBy !== progress.userId ? (
          <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
            Cập nhật thay bởi:{" "}
            {data.profiles.find((profile) => profile.id === progress.submittedBy)?.fullName ||
              "Tài khoản quản lý"}
          </p>
        ) : null}
      </div>

      {visiblePhotoPreviews.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {visiblePhotoPreviews.map((photo, index) => (
            <Image
              alt={`Ảnh cập nhật ${index + 1} cho ${task.tagname}`}
              className="h-36 w-full rounded-[var(--radius-field)] border border-[var(--border-strong)] object-cover"
              height={180}
              key={photo.source}
              src={photo.url}
              unoptimized
              width={260}
            />
          ))}
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-3">
          <LeaderTaskManager data={data} onChanged={onDataChanged} row={row} />
        </div>
      ) : null}
    </Widget>
  );
};

const Info = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]">
    <p className="text-xs font-semibold uppercase text-[var(--text-soft)]">{label}</p>
    <p className="mt-1 truncate font-semibold text-[var(--foreground)]">{value}</p>
  </div>
);
