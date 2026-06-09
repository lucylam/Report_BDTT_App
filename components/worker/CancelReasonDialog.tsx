"use client";

import { useState } from "react";
import type { Task } from "@/types/domain";

interface CancelReasonDialogProps {
  readonly task: Task;
  readonly onClose: () => void;
  readonly onConfirm: (reason: string) => void;
}

export const CancelReasonDialog = ({
  task,
  onClose,
  onConfirm
}: CancelReasonDialogProps): React.ReactElement => {
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string>("");

  const submit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Vui lòng nhập lý do hủy rõ ràng.");
      return;
    }
    onConfirm(trimmedReason);
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
    >
      <form
        className="soft-panel w-full rounded-[2rem] p-6 sm:max-w-lg"
        onSubmit={submit}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--danger)]">
          Hủy hạng mục
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{task.tagname}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Hạng mục này sẽ chuyển sang trạng thái Cancel và báo cho admin. Vui lòng nhập lý do trước khi xác nhận.
        </p>
        <label className="mt-5 block">
          <span className="text-sm font-semibold">Lý do hủy</span>
          <textarea
            autoFocus
            className="focus-ring mt-2 min-h-28 w-full resize-y rounded-[1.5rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-base leading-6"
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            placeholder="Ví dụ: không thực hiện được do thiếu vật tư, thiết bị chưa sẵn sàng..."
            value={reason}
          />
        </label>
        {error ? (
          <p
            aria-live="polite"
            className="mt-3 rounded-2xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="focus-ring pressable min-h-11 rounded-full border border-[var(--border)] bg-white/80 px-4 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Không hủy
          </button>
          <button
            className="focus-ring pressable min-h-11 rounded-full bg-[var(--danger)] px-4 text-sm font-semibold text-white"
            type="submit"
          >
            Xác nhận Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
