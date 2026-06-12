import { Badge, type BadgeTone } from "@/components/ui";
import type { SaveState } from "@/components/worker/types";

const statusMap: Record<SaveState, { readonly label: string; readonly tone: BadgeTone }> = {
  idle: { label: "Sẵn sàng", tone: "neutral" },
  saving: { label: "Đang lưu", tone: "info" },
  saved: { label: "Đã lưu", tone: "success" },
  offline: { label: "Chờ mạng, sẽ tự gửi", tone: "warning" },
  error: { label: "Lỗi lưu", tone: "danger" }
};

export const SaveStatus = ({ state }: { readonly state: SaveState }): React.ReactElement => {
  const status = statusMap[state];
  return (
    <span aria-live="polite">
      <Badge solid tone={status.tone}>
        {status.label}
      </Badge>
    </span>
  );
};
