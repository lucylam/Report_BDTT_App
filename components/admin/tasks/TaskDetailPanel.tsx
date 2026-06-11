import Image from "next/image";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getProgressLabel,
  getStatusLabel,
  getStatusTone,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";

interface TaskDetailPanelProps {
  readonly row: TaskRow | null;
}

export const TaskDetailPanel = ({ row }: TaskDetailPanelProps): React.ReactElement => {
  if (!row) {
    return (
      <aside className="glass-card rounded-[1.65rem] p-5">
        <h2 className="text-lg font-bold">Chi tiết hạng mục</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Chọn một hạng mục trong bảng để xem task, WO, resource, ghi chú và ảnh cập nhật.
        </p>
      </aside>
    );
  }

  const { task, percent, progress, status } = row;
  const photoPath = progress?.photoPath;
  const canPreviewPhoto =
    photoPath?.startsWith("data:") || photoPath?.startsWith("http://") || photoPath?.startsWith("https://");

  return (
    <aside className="glass-card sticky top-24 max-h-[calc(100dvh-7rem)] overflow-auto rounded-[1.65rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xl font-bold leading-tight">{task.tagname}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--primary-strong)]">
            WO {task.wo || "N/A"}
          </p>
        </div>
        <StatusBadge
          label={getProgressLabel(task, percent)}
          tone={task.isCancelled ? "danger" : getStatusTone(status)}
        />
      </div>

      <div className="mt-4 rounded-[1.25rem] bg-[var(--line-soft)] p-4">
        <p className="text-xs font-bold uppercase text-slate-600">Hạng mục</p>
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
        <Info label="Finish" value={task.finishDate || "N/A"} />
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-white/86 p-4">
        <p className="text-xs font-bold uppercase text-slate-600">Resource</p>
        <p className="mt-2 text-sm font-semibold">{task.resourceName || "N/A"}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Nhóm trưởng: {task.nhomTruong || "N/A"}
        </p>
      </div>

      {task.isCancelled ? (
        <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
          Lý do cancel: {task.cancelReason || "Chưa nhập lý do"}
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-white/86 p-4">
        <p className="text-xs font-bold uppercase text-slate-600">Ghi chú worker</p>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-800">
          {progress?.note || "Chưa có ghi chú cho ngày báo cáo hiện tại."}
        </p>
      </div>

      {canPreviewPhoto && photoPath ? (
        <Image
          alt={`Ảnh cập nhật cho ${task.tagname}`}
          className="mt-4 h-56 w-full rounded-2xl border border-[var(--border-strong)] object-cover shadow-sm"
          height={224}
          src={photoPath}
          unoptimized
          width={420}
        />
      ) : null}
    </aside>
  );
};

const Info = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-[1rem] bg-white/86 p-3 ring-1 ring-[var(--border)]">
      <p className="text-xs font-bold uppercase text-slate-600">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-900">{value}</p>
    </div>
  );
};
