"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, EmptyState, Input, Select, Textarea, Widget, WidgetHeader } from "@/components/ui";
import { compressPhotoToDataUrl, resolvePhotoPreviewUrl } from "@/lib/photo";
import type { AbnormalitySeverity, AbnormalityStatus, AppData } from "@/types/domain";

interface RawAbnormality {
  readonly id: string;
  readonly task_id: string | null;
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly severity: AbnormalitySeverity;
  readonly status: AbnormalityStatus;
  readonly reported_by: string;
  readonly assigned_to: string | null;
  readonly resolution_note: string;
  readonly photo_paths: string[];
  readonly created_at: string;
}

const severityLabel: Record<AbnormalitySeverity, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Khẩn cấp"
};
const statusLabel: Record<AbnormalityStatus, string> = {
  new: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã khắc phục",
  closed: "Đã đóng"
};

const nextStatus = (status: AbnormalityStatus): AbnormalityStatus | null => {
  if (status === "new") return "in_progress";
  if (status === "in_progress") return "resolved";
  if (status === "resolved") return "closed";
  return null;
};

const PhotoStrip = ({ paths }: { readonly paths: readonly string[] }): React.ReactElement | null => {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void Promise.all(paths.map((path) => resolvePhotoPreviewUrl(path)))
      .then((values) => {
        if (active) setUrls(values);
      })
      .catch(() => {
        if (active) setUrls([]);
      });
    return () => {
      active = false;
    };
  }, [paths]);
  if (urls.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto">
      {urls.map((url, index) => (
        // Signed URLs are short lived and cannot be routed through next/image safely.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`Ảnh bất thường ${index + 1}`} className="h-20 w-24 shrink-0 border border-[var(--line)] object-cover" key={url} src={url} />
      ))}
    </div>
  );
};

export const AbnormalityBoard = ({
  data,
  canManage
}: {
  readonly data: AppData;
  readonly canManage: boolean;
}): React.ReactElement => {
  const [items, setItems] = useState<RawAbnormality[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<AbnormalitySeverity>("medium");
  const [taskId, setTaskId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [assignees, setAssignees] = useState<Record<string, string>>({});

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/abnormalities", { cache: "no-store" });
      const payload = (await response.json()) as { items?: RawAbnormality[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không tải được bất thường.");
      setItems(payload.items ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được bất thường.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const createItem = async (): Promise<void> => {
    setBusyId("create");
    try {
      const task = taskId ? data.tasks.find((entry) => entry.id === taskId) : undefined;
      const response = await fetch("/api/abnormalities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, title, description, location, severity })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không tạo được bất thường.");
      setTitle("");
      setDescription("");
      setLocation("");
      setTaskId("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được bất thường.");
    } finally {
      setBusyId("");
    }
  };

  const updateItem = async (
    item: RawAbnormality,
    status: AbnormalityStatus = item.status
  ): Promise<void> => {
    setBusyId(item.id);
    try {
      const response = await fetch("/api/abnormalities", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          abnormalityId: item.id,
          status,
          assigneeUsername: assignees[item.id] || undefined,
          resolutionNote: resolutionNotes[item.id] || ""
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không cập nhật được bất thường.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không cập nhật được bất thường.");
    } finally {
      setBusyId("");
    }
  };

  const uploadPhoto = async (item: RawAbnormality, file: File): Promise<void> => {
    setBusyId(item.id);
    try {
      const dataUrl = await compressPhotoToDataUrl(file);
      const response = await fetch("/api/abnormalities/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ abnormalityId: item.id, dataUrl })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không tải được ảnh bất thường.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được ảnh bất thường.");
    } finally {
      setBusyId("");
    }
  };

  const activeCount = useMemo(() => items.filter((item) => item.status !== "closed").length, [items]);

  return (
    <div className="grid gap-3">
      <Widget>
        <WidgetHeader subtitle="Ghi nhận độc lập với báo cáo tiến độ; có thể liên kết một WorkOrder" title="Ghi nhận bất thường" />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input aria-label="Tiêu đề bất thường" onChange={(event) => setTitle(event.target.value)} placeholder="Tiêu đề bất thường" value={title} />
          <Input aria-label="Vị trí" onChange={(event) => setLocation(event.target.value)} placeholder="Vị trí/khu vực" value={location} />
          <Select aria-label="Mức độ" onChange={(event) => setSeverity(event.target.value as AbnormalitySeverity)} value={severity}>
            {Object.entries(severityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select aria-label="WorkOrder liên quan" onChange={(event) => setTaskId(event.target.value)} value={taskId}>
            <option value="">Không gắn WorkOrder</option>
            {data.tasks.slice(0, 500).map((task) => <option key={task.id} value={task.id}>{task.tagname} · {task.wo}</option>)}
          </Select>
        </div>
        <Textarea className="mt-3" onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả hiện tượng và ảnh hưởng" value={description} />
        <div className="mt-3 flex justify-end">
          <Button disabled={busyId === "create" || title.trim().length < 3} onClick={() => void createItem()}>
            {busyId === "create" ? "Đang ghi nhận..." : "Ghi nhận bất thường"}
          </Button>
        </div>
      </Widget>

      <Widget>
        <WidgetHeader subtitle={`${activeCount} mục chưa đóng`} title="Danh sách bất thường" />
        {message ? <Alert className="mt-3" tone="warning">{message}</Alert> : null}
        {isLoading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Đang tải bất thường...</p>
        ) : items.length === 0 ? (
          <EmptyState description="Chưa có bất thường trong phạm vi của bạn." title="Chưa có dữ liệu" />
        ) : (
          <div className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {items.map((item) => {
              const task = data.tasks.find((entry) => entry.id === item.task_id);
              const reporter = data.profiles.find((entry) => entry.id === item.reported_by);
              const next = nextStatus(item.status);
              return (
                <article className="grid gap-3 py-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.2fr)_minmax(300px,1fr)]" key={item.id}>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={item.severity === "critical" || item.severity === "high" ? "danger" : "warning"}>{severityLabel[item.severity]}</Badge>
                      <Badge tone={item.status === "closed" || item.status === "resolved" ? "success" : "info"}>{statusLabel[item.status]}</Badge>
                    </div>
                    <h3 className="mt-2 break-words text-base font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{item.location || "Chưa ghi vị trí"}</p>
                    {task ? <p className="mt-1 break-words font-mono text-sm text-[var(--primary-strong)]">{task.tagname} · {task.wo}</p> : null}
                  </div>
                  <div className="text-sm leading-6">
                    <p>{item.description || "Không có mô tả bổ sung."}</p>
                    <p className="mt-1 text-[var(--text-muted)]">Người ghi nhận: {reporter?.fullName || "—"} · {new Date(item.created_at).toLocaleString("vi-VN")}</p>
                    {item.resolution_note ? <p className="mt-2 border-l-2 border-[var(--success)] pl-2">{item.resolution_note}</p> : null}
                    <PhotoStrip paths={item.photo_paths} />
                  </div>
                  <div>
                    {canManage && item.status !== "closed" ? (
                      <>
                        <Select aria-label={`Người phụ trách ${item.title}`} onChange={(event) => setAssignees((current) => ({ ...current, [item.id]: event.target.value }))} value={assignees[item.id] ?? ""}>
                          <option value="">Giữ người phụ trách hiện tại</option>
                          {data.profiles.filter((profile) => profile.canLogin).map((profile) => <option key={profile.id} value={profile.username}>{profile.fullName}</option>)}
                        </Select>
                        <Input aria-label={`Kết quả xử lý ${item.title}`} className="mt-2" onChange={(event) => setResolutionNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Kết quả xử lý" value={resolutionNotes[item.id] ?? ""} />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button disabled={busyId === item.id} onClick={() => void updateItem(item)} size="sm" variant="secondary">Lưu phân công</Button>
                          {next ? <Button disabled={busyId === item.id} onClick={() => void updateItem(item, next)} size="sm">{statusLabel[next]}</Button> : null}
                        </div>
                      </>
                    ) : null}
                    {item.photo_paths.length < 5 && item.status !== "closed" ? (
                      <label className="focus-ring mt-2 inline-flex min-h-11 cursor-pointer items-center border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold">
                        Thêm ảnh ({item.photo_paths.length}/5)
                        <input accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(item, file); event.currentTarget.value = ""; }} type="file" />
                      </label>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Widget>
    </div>
  );
};
