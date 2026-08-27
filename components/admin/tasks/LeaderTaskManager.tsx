"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import type { TaskRow } from "@/components/admin/tasks/taskTableModel";
import { getPlanReportDate } from "@/lib/date";
import { getMissingLeaderTaskCreateFields } from "@/lib/leaderTaskCreate";
import { resolveTaskReporterId } from "@/lib/taskReporter";
import type { AppData, Profile } from "@/types/domain";

interface LeaderTaskManagerProps {
  readonly data: AppData;
  readonly row: TaskRow | null;
  readonly onChanged: () => Promise<void>;
  readonly showCreate?: boolean;
}

type DialogMode = "create" | "reassign" | "cancel" | "report" | null;
type OpenDialogMode = Exclude<DialogMode, null>;

interface ApiPayload {
  readonly action: "create" | "reassign" | "cancel" | "updateReport";
  readonly [key: string]: unknown;
}

const postLeaderAction = async (payload: ApiPayload): Promise<void> => {
  const response = await fetch("/api/tasks/leader", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = (await response.json().catch(() => ({}))) as {
    readonly error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error || "Không thực hiện được thao tác quản lý task.");
  }
};

const getMemberOptions = (data: AppData): Profile[] =>
  data.profiles
    .filter((profile) => profile.canLogin && !profile.isPlaceholder)
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "vi"));

export const LeaderTaskManager = ({
  data,
  row,
  onChanged,
  showCreate = false
}: LeaderTaskManagerProps): React.ReactElement => {
  const members = useMemo(() => getMemberOptions(data), [data]);
  const planReportDate = getPlanReportDate(data.tasks);
  const [mode, setMode] = useState<DialogMode>(null);
  const [assigneeUsername, setAssigneeUsername] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [reportDate, setReportDate] = useState(planReportDate);
  const [percent, setPercent] = useState("0");
  const [note, setNote] = useState("");
  const [taskName, setTaskName] = useState("");
  const [tagname, setTagname] = useState("");
  const [wo, setWo] = useState("");
  const [unit, setUnit] = useState("");
  const [section, setSection] = useState("");
  const [priority, setPriority] = useState("2");
  const [progressMode, setProgressMode] = useState<"continuous" | "binary">("continuous");
  const [startDate, setStartDate] = useState(planReportDate);
  const [finishDate, setFinishDate] = useState(planReportDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reporter = useMemo(() => {
    const assignee = data.profiles.find(
      (profile) => profile.username === assigneeUsername
    );
    const reporterId = resolveTaskReporterId(assignee?.id, data.profiles);
    return data.profiles.find((profile) => profile.id === reporterId) ?? assignee ?? null;
  }, [assigneeUsername, data.profiles]);
  const reporterUsername = reporter?.username ?? "";

  const setDefaultPeople = (): void => {
    const assignee = data.profiles.find((profile) => profile.id === row?.task.assignedTo);
    const first = members[0];
    setAssigneeUsername(assignee?.username ?? first?.username ?? "");
  };

  const open = (nextMode: OpenDialogMode): void => {
    setError("");
    setDefaultPeople();
    if (nextMode === "report") {
      setReportDate(getPlanReportDate(data.tasks));
      setPercent(String(row?.percent ?? 0));
      setNote("");
    }
    setMode(nextMode);
  };

  const close = (): void => {
    if (!submitting) setMode(null);
  };

  const submit = async (): Promise<void> => {
    if (!mode) return;
    if (mode === "create") {
      const missingFields = getMissingLeaderTaskCreateFields({
        taskName,
        tagname,
        wo,
        donVi: unit,
        section,
        priority,
        progressMode,
        startDate,
        finishDate,
        assigneeUsername,
        reporterUsername
      });
      if (missingFields.length > 0) {
        setError(`Cần nhập hoặc chọn đầy đủ: ${missingFields.join(", ")}.`);
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      if (mode === "create") {
        await postLeaderAction({
          action: "create",
          assigneeUsername,
          reporterUsername,
          task: {
            taskName,
            tagname,
            wo,
            donVi: unit,
            section,
            priority: Number(priority),
            progressMode,
            startDate,
            finishDate
          }
        });
      } else if (mode === "reassign" && row) {
        await postLeaderAction({
          action: "reassign",
          taskId: row.task.id,
          assigneeUsername,
          reporterUsername
        });
      } else if (mode === "cancel" && row) {
        await postLeaderAction({
          action: "cancel",
          taskId: row.task.id,
          cancelReason
        });
      } else if (mode === "report" && row) {
        await postLeaderAction({
          action: "updateReport",
          taskId: row.task.id,
          reporterUsername,
          reportDate,
          percent: Number(percent),
          note
        });
      }
      await onChanged();
      setMode(null);
      setCancelReason("");
      if (mode === "create") {
        setTaskName("");
        setTagname("");
        setWo("");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Thao tác thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {showCreate ? (
        <Button onClick={() => open("create")} size="sm">
          + Task phát sinh
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
          <Button
            disabled={!row || row.task.isCancelled}
            onClick={() => open("reassign")}
            size="sm"
            variant="secondary"
          >
            Phân công
          </Button>
          <Button
            disabled={!row || row.task.isCancelled}
            onClick={() => open("report")}
            size="sm"
            variant="secondary"
          >
            Báo cáo thay
          </Button>
          <Button
            className="col-span-2"
            disabled={!row || row.task.isCancelled}
            onClick={() => open("cancel")}
            size="sm"
            variant="danger"
          >
            Hủy task
          </Button>
        </div>
      )}

      {mode ? (
        <Dialog
          description={getDescription(mode, row)}
          eyebrow="Quyền nhóm trưởng"
          eyebrowTone={mode === "cancel" ? "danger" : "primary"}
          onClose={close}
          title={getTitle(mode)}
        >
          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {mode === "create" ? (
              <>
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  Tất cả thông tin dưới đây đều bắt buộc.
                </p>
                <Field label="Tên công việc *">
                  <Input required onChange={(event) => setTaskName(event.target.value)} value={taskName} />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Tagname *">
                    <Input required onChange={(event) => setTagname(event.target.value)} value={tagname} />
                  </Field>
                  <Field label="WorkOrder *">
                    <Input required onChange={(event) => setWo(event.target.value)} value={wo} />
                  </Field>
                  <Field label="Đơn vị chủ quản *">
                    <Input required onChange={(event) => setUnit(event.target.value)} value={unit} />
                  </Field>
                  <Field label="Section *">
                    <Input required onChange={(event) => setSection(event.target.value)} value={section} />
                  </Field>
                  <Field label="Ngày bắt đầu *">
                    <Input required onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
                  </Field>
                  <Field label="Ngày kết thúc *">
                    <Input required onChange={(event) => setFinishDate(event.target.value)} type="date" value={finishDate} />
                  </Field>
                  <Field label="Mức ưu tiên *">
                    <Select required onChange={(event) => setPriority(event.target.value)} value={priority}>
                      <option value="1">P1</option>
                      <option value="2">P2</option>
                      <option value="3">P3</option>
                    </Select>
                  </Field>
                  <Field label="Chế độ tiến độ *">
                    <Select
                      required
                      onChange={(event) =>
                        setProgressMode(event.target.value as "continuous" | "binary")
                      }
                      value={progressMode}
                    >
                      <option value="continuous">0–100%</option>
                      <option value="binary">Chỉ 0% hoặc 100%</option>
                    </Select>
                  </Field>
                </div>
              </>
            ) : null}

            {mode === "create" || mode === "reassign" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <MemberField label={mode === "create" ? "Người thực hiện *" : "Người thực hiện"} members={members} onChange={setAssigneeUsername} required value={assigneeUsername} />
                <ReadonlyMemberField label="Người báo cáo (tự động)" member={reporter} />
              </div>
            ) : null}

            {mode === "report" ? (
              <>
                <ReadonlyMemberField label="Ghi nhận báo cáo cho" member={reporter} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    hint="Trước 14:00 tính cho hôm nay; từ 14:00 tính cho ngày kế tiếp."
                    label="Ngày báo cáo (tự động)"
                  >
                    <Input readOnly type="date" value={reportDate} />
                  </Field>
                  <Field label="Tiến độ (%)" hint="Nhập số nguyên từ 0 đến 100.">
                    {row?.task.progressMode === "binary" ? (
                      <Select
                        onChange={(event) => setPercent(event.target.value)}
                        value={percent === "100" ? "100" : "0"}
                      >
                        <option value="0">0%</option>
                        <option value="100">100%</option>
                      </Select>
                    ) : (
                      <Input max={100} min={0} onChange={(event) => setPercent(event.target.value)} type="number" value={percent} />
                    )}
                  </Field>
                </div>
                <Field label="Ghi chú lần cập nhật này">
                  <Textarea onChange={(event) => setNote(event.target.value)} value={note} />
                </Field>
                <Alert tone="info">
                  Người báo cáo được xác định tự động theo cơ cấu phân nhóm; người thao tác vẫn được lưu riêng để truy vết.
                </Alert>
              </>
            ) : null}

            {mode === "cancel" ? (
              <Field label="Lý do hủy">
                <Textarea onChange={(event) => setCancelReason(event.target.value)} value={cancelReason} />
              </Field>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 md:flex-row md:justify-end">
              <Button disabled={submitting} onClick={close} variant="ghost">Đóng</Button>
              <Button
                disabled={
                  submitting ||
                  (mode !== "cancel" && members.length === 0)
                }
                type="submit"
                variant={mode === "cancel" ? "danger" : "primary"}
              >
                {submitting ? "Đang lưu..." : getSubmitLabel(mode)}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </>
  );
};

const MemberField = ({ label, members, onChange, required, value }: {
  readonly label: string;
  readonly members: readonly Profile[];
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
  readonly value: string;
}): React.ReactElement => (
  <Field label={label}>
    <Select required={required} onChange={(event) => onChange(event.target.value)} value={value}>
      {members.map((member) => (
        <option key={member.id} value={member.username}>
          {member.fullName} · {member.orgTitle}
        </option>
      ))}
    </Select>
  </Field>
);

const ReadonlyMemberField = ({ label, member }: {
  readonly label: string;
  readonly member: Profile | null;
}): React.ReactElement => (
  <Field label={label}>
    <Input
      disabled
      value={member ? `${member.fullName} · ${member.orgTitle}` : "Chưa xác định"}
    />
  </Field>
);

const getTitle = (mode: OpenDialogMode): string => {
  if (mode === "create") return "Tạo task phát sinh";
  if (mode === "reassign") return "Thay người phụ trách";
  if (mode === "report") return "Cập nhật báo cáo thay";
  return "Hủy task";
};

const getDescription = (mode: OpenDialogMode, row: TaskRow | null): string => {
  if (mode === "create") return "Task mới được đánh dấu là phát sinh và chỉ giao trong phạm vi nhóm phụ trách.";
  return `${row?.task.tagname || "Task"} · WO ${row?.task.wo || "N/A"}`;
};

const getSubmitLabel = (mode: OpenDialogMode): string => {
  if (mode === "create") return "Tạo và giao task";
  if (mode === "reassign") return "Lưu phân công";
  if (mode === "report") return "Lưu báo cáo";
  return "Xác nhận hủy";
};
