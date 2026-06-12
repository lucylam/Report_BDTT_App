"use client";

import { useState } from "react";
import { Alert, Button, Dialog, Textarea } from "@/components/ui";
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
    <Dialog
      description="Hạng mục này sẽ chuyển sang trạng thái Cancel và báo cho admin. Vui lòng nhập lý do trước khi xác nhận."
      eyebrow="Hủy hạng mục"
      eyebrowTone="danger"
      onClose={onClose}
      title={task.tagname}
    >
      <form onSubmit={submit}>
        <label className="mt-5 block">
          <span className="text-sm font-extrabold">Lý do hủy</span>
          <Textarea
            autoFocus
            className="mt-2"
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            placeholder="Ví dụ: thiếu vật tư, thiết bị chưa sẵn sàng, không thể thực hiện theo điều kiện hiện tại..."
            value={reason}
          />
        </label>
        {error ? <Alert className="mt-3">{error}</Alert> : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={onClose} variant="secondary">
            Không hủy
          </Button>
          <Button type="submit" variant="danger">
            Xác nhận Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
