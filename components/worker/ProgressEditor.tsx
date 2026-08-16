"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Alert, Textarea } from "@/components/ui";
import { SaveStatus } from "@/components/worker/SaveStatus";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import {
  compressPhotoToDataUrl,
  getProgressPhotoPaths,
  MAX_PHOTOS_PER_REPORT,
  MAX_SOURCE_PHOTO_MEGABYTES,
  resolvePhotoPreviewUrl
} from "@/lib/photo";
import { percentOptions } from "@/lib/progress";
import { isPercentAllowedForMode } from "@/lib/progressMode";
import type { ProgressPercent, ProgressRecord, Task } from "@/types/domain";

interface ProgressEditorProps {
  readonly task: Task;
  readonly progress: ProgressRecord | null;
  readonly saveState: SaveState;
  readonly onChange: (update: WorkerProgressUpdate) => void;
  readonly density?: "compact" | "comfortable";
  readonly showDetails?: boolean;
}

export const ProgressEditor = ({
  task,
  progress,
  saveState,
  onChange,
  density = "comfortable",
  showDetails = true
}: ProgressEditorProps): React.ReactElement => {
  const [photoError, setPhotoError] = useState<string>("");
  const [photoPreviews, setPhotoPreviews] = useState<
    readonly { readonly source: string; readonly url: string }[]
  >([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [isIssueFormOpen, setIsIssueFormOpen] = useState<boolean>(false);
  const [suggestedTag, setSuggestedTag] = useState<string>("");
  const [issueType, setIssueType] = useState<"wrong_tag" | "wrong_wo" | "wrong_assignment" | "other">("wrong_tag");
  const [issueNote, setIssueNote] = useState<string>("");
  const [issueState, setIssueState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [issueMessage, setIssueMessage] = useState<string>("");
  const [isAbnormalityFormOpen, setIsAbnormalityFormOpen] = useState(false);
  const [abnormalityTitle, setAbnormalityTitle] = useState("");
  const [abnormalityLocation, setAbnormalityLocation] = useState("");
  const [abnormalityDescription, setAbnormalityDescription] = useState("");
  const [abnormalitySeverity, setAbnormalitySeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [abnormalityFiles, setAbnormalityFiles] = useState<File[]>([]);
  const [abnormalityState, setAbnormalityState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [abnormalityMessage, setAbnormalityMessage] = useState("");
  const percent = progress?.percent ?? 0;
  const [manualState, setManualState] = useState<{
    readonly taskId: string;
    readonly value: string;
  }>({ taskId: task.id, value: String(percent) });
  const manualPercent =
    manualState.taskId === task.id ? manualState.value : String(percent);
  const note = progress?.note ?? "";
  const photoPaths = useMemo(
    () => getProgressPhotoPaths(progress),
    [progress]
  );
  const visiblePhotoPreviews = photoPreviews.filter((preview) =>
    photoPaths.includes(preview.source)
  );
  const isManualPercent = !percentOptions.includes(percent);
  const availablePercentOptions =
    task.progressMode === "binary" ? ([0, 100] as const) : percentOptions;

  useEffect(() => {
    let cancelled = false;
    if (photoPaths.length === 0) return;

    void Promise.all(
      photoPaths.map(async (source) => ({
        source,
        url: await resolvePhotoPreviewUrl(source)
      }))
    )
      .then((previews) => {
        if (!cancelled) {
          setPhotoPreviews(previews);
          setPhotoError("");
        }
      })
      .catch((error: unknown) => {
        console.error("[ProgressEditor.resolvePhotoPreviewUrl]", error);
        if (!cancelled) {
          setPhotoError(
            error instanceof Error ? error.message : "Khong tai duoc anh."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [photoPaths]);

  const stageChange = (
    nextPercent: ProgressPercent,
    nextNote = note,
    nextPhotoPaths = photoPaths
  ): void => {
    onChange({
      percent: nextPercent,
      note: nextNote,
      photoPath: nextPhotoPaths[0],
      photoPaths: nextPhotoPaths
    });
  };

  const stageManualPercent = (value: string): void => {
    setManualState({ taskId: task.id, value });
    if (value.trim() === "") return;
    const nextPercent = Number(value);
    if (!Number.isFinite(nextPercent)) return;
    const normalized = Math.max(0, Math.min(100, Math.round(nextPercent)));
    if (!isPercentAllowedForMode(normalized, task.progressMode)) return;
    stageChange(normalized);
  };

  const handlePhotos = (files: readonly File[]): void => {
    const availableSlots = MAX_PHOTOS_PER_REPORT - photoPaths.length;
    const acceptedFiles = files.slice(0, availableSlots);
    if (acceptedFiles.length === 0) {
      setPhotoError(`Mỗi hạng mục được lưu tối đa ${MAX_PHOTOS_PER_REPORT} ảnh.`);
      return;
    }
    setPhotoError("");
    setIsProcessingPhoto(true);
    void (async () => {
      const dataUrls: string[] = [];
      for (const file of acceptedFiles) {
        dataUrls.push(await compressPhotoToDataUrl(file));
      }
      return dataUrls;
    })()
      .then((dataUrls) => {
        stageChange(percent, note, [...photoPaths, ...dataUrls]);
        if (files.length > acceptedFiles.length) {
          setPhotoError(`Chỉ thêm ${acceptedFiles.length} ảnh để không vượt giới hạn ${MAX_PHOTOS_PER_REPORT} ảnh.`);
        }
      })
      .catch((error: unknown) => {
        console.error("[ProgressEditor.handlePhoto]", error);
        setPhotoError(
          error instanceof Error ? error.message : "Không xử lý được ảnh."
        );
      })
      .finally(() => setIsProcessingPhoto(false));
  };

  const handlePhotoInput = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) handlePhotos(files);
    event.currentTarget.value = "";
  };

  const removePhoto = (photoPath: string): void => {
    stageChange(percent, note, photoPaths.filter((item) => item !== photoPath));
  };

  const submitDataIssue = async (): Promise<void> => {
    if (!suggestedTag.trim() && !issueNote.trim()) {
      setIssueState("error");
      setIssueMessage("Hãy nhập tag đúng hoặc mô tả điểm sai.");
      return;
    }
    setIssueState("sending");
    setIssueMessage("");
    try {
      const response = await fetch("/api/data-issues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task,
          issueType,
          suggestedValue: suggestedTag,
          note: issueNote
        })
      });
      const result = (await response.json().catch(() => null)) as
        | { readonly error?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.error || "Không gửi được báo sai dữ liệu.");
      }
      setIssueState("sent");
      setIssueMessage("Đã gửi giám sát kiểm tra. Dữ liệu gốc chưa bị thay đổi.");
    } catch (error) {
      setIssueState("error");
      setIssueMessage(error instanceof Error ? error.message : "Không gửi được báo sai dữ liệu.");
    }
  };

  const submitAbnormality = async (): Promise<void> => {
    if (abnormalityTitle.trim().length < 3) {
      setAbnormalityState("error");
      setAbnormalityMessage("Hãy nhập tiêu đề bất thường ít nhất 3 ký tự.");
      return;
    }
    setAbnormalityState("sending");
    setAbnormalityMessage("");
    try {
      const response = await fetch("/api/abnormalities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task,
          title: abnormalityTitle,
          location: abnormalityLocation,
          description: abnormalityDescription,
          severity: abnormalitySeverity
        })
      });
      const payload = (await response.json()) as { abnormalityId?: string; error?: string };
      if (!response.ok || !payload.abnormalityId) {
        throw new Error(payload.error || "Không ghi nhận được bất thường.");
      }
      for (const file of abnormalityFiles.slice(0, 5)) {
        const dataUrl = await compressPhotoToDataUrl(file);
        const photoResponse = await fetch("/api/abnormalities/photos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ abnormalityId: payload.abnormalityId, dataUrl })
        });
        const photoPayload = (await photoResponse.json()) as { error?: string };
        if (!photoResponse.ok) throw new Error(photoPayload.error || "Không tải được ảnh bất thường.");
      }
      setAbnormalityState("sent");
      setAbnormalityMessage("Đã ghi nhận bất thường và gửi thông báo cho người giám sát.");
      setAbnormalityFiles([]);
    } catch (error) {
      setAbnormalityState("error");
      setAbnormalityMessage(error instanceof Error ? error.message : "Không ghi nhận được bất thường.");
    }
  };

  return (
    <div className={density === "compact" ? "space-y-3" : "space-y-4"}>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--primary-strong)]">
            Chọn tiến độ
          </span>
          <SaveStatus state={saveState} />
        </div>
        <div
          aria-label={`Chọn phần trăm hoàn thành cho ${task.tagname}`}
          className={`control-pill grid gap-1 rounded-[var(--radius-field)] p-1 ${
            task.progressMode === "binary" ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-6"
          }`}
          role="group"
        >
          {availablePercentOptions.map((option) => (
            <button
              aria-pressed={option === percent}
              className={`focus-ring pressable min-h-12 rounded-[calc(var(--radius-field)-0.25rem)] border text-sm font-semibold tabular-nums lg:min-h-9 ${
                option === percent
                  ? "border-[var(--primary)] bg-[var(--primary-strong)] text-[var(--primary-contrast)]"
                  : "border-transparent bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              key={option}
              onClick={() => {
                setManualState({ taskId: task.id, value: String(option) });
                stageChange(option);
              }}
              type="button"
            >
              {option}%
            </button>
          ))}
          {task.progressMode !== "binary" ? <label
            className={`flex min-h-12 min-w-0 items-center rounded-[calc(var(--radius-field)-0.25rem)] border bg-[var(--surface)] px-2 shadow-sm transition focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[rgba(111,165,31,0.35)] lg:min-h-9 ${
              isManualPercent
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                : "border-transparent text-[var(--foreground)]"
            }`}
          >
            <span className="sr-only">Nhập tiến độ thủ công</span>
            <input
              aria-label="Nhập tiến độ thủ công"
              className="min-w-0 flex-1 bg-transparent text-center text-sm font-medium tabular-nums outline-none placeholder:text-[var(--text-soft)]"
              inputMode="numeric"
              max={100}
              min={0}
              onBlur={() => {
                if (manualPercent.trim() === "") {
                  setManualState({ taskId: task.id, value: String(percent) });
                }
              }}
              onChange={(event) => stageManualPercent(event.target.value)}
              placeholder="Khác"
              type="number"
              value={manualPercent}
            />
            <span className="shrink-0 text-sm font-semibold">%</span>
          </label> : null}
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {task.progressMode === "binary"
            ? "Thiết bị này chỉ ghi nhận chưa hoàn thành (0%) hoặc hoàn thành (100%)."
            : "Có thể chọn nhanh hoặc nhập phần trăm thủ công từ 0 đến 100%."}
        </p>
      </div>

      {showDetails ? (
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Ghi chú</span>
          <Textarea
            className="mt-2"
            onChange={(event) => {
              const nextNote = event.target.value;
              stageChange(percent, nextNote);
            }}
            placeholder="Ghi chú vấn đề phát sinh..."
            value={note}
          />
        </label>
      ) : null}

      {showDetails ? (
        <section className="border-l-2 border-[var(--warning)] bg-[var(--warning-soft)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">Tag hiện tại: {task.tagname || "Chưa có"}</p>
              <p className="mt-0.5 text-xs font-normal text-[var(--text-muted)]">Không tự sửa dữ liệu kế hoạch. Gửi giám sát kiểm tra trước.</p>
            </div>
            <button
              className="focus-ring pressable min-h-11 border border-[var(--warning)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)]"
              onClick={() => setIsIssueFormOpen((current) => !current)}
              type="button"
            >
              Báo sai dữ liệu
            </button>
          </div>
          {isIssueFormOpen ? (
            <div className="mt-3 grid gap-2 border-t border-[var(--warning)] pt-3">
              <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
                Loại dữ liệu cần kiểm tra
                <select
                  className="focus-ring min-h-11 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base"
                  onChange={(event) => setIssueType(event.target.value as typeof issueType)}
                  value={issueType}
                >
                  <option value="wrong_tag">Sai Tag</option>
                  <option value="wrong_wo">Sai WO</option>
                  <option value="wrong_assignment">Sai phân công</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
                Tag đề xuất
                <input
                  className="focus-ring min-h-11 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base font-normal"
                  maxLength={160}
                  onChange={(event) => setSuggestedTag(event.target.value)}
                  placeholder="Nhập tag đúng nếu đã biết"
                  value={suggestedTag}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
                Mô tả
                <Textarea
                  maxLength={1000}
                  onChange={(event) => setIssueNote(event.target.value)}
                  placeholder="Nêu vị trí hoặc nội dung cần giám sát kiểm tra"
                  value={issueNote}
                />
              </label>
              <button
                className="focus-ring pressable min-h-11 justify-self-start bg-[var(--primary-strong)] px-4 text-sm font-medium text-[var(--primary-contrast)] disabled:opacity-60"
                disabled={issueState === "sending" || issueState === "sent"}
                onClick={() => void submitDataIssue()}
                type="button"
              >
                {issueState === "sending" ? "Đang gửi..." : issueState === "sent" ? "Đã gửi" : "Gửi giám sát"}
              </button>
              {issueMessage ? (
                <Alert tone={issueState === "error" ? "danger" : "success"}>{issueMessage}</Alert>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {showDetails ? (
        <section className="border-l-2 border-[var(--danger)] bg-[var(--surface-muted)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Ghi nhận bất thường</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Tạo hồ sơ riêng, có trạng thái xử lý và tối đa 5 ảnh.</p>
            </div>
            <button
              className="focus-ring pressable min-h-11 border border-[var(--danger)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--danger)]"
              onClick={() => setIsAbnormalityFormOpen((current) => !current)}
              type="button"
            >
              {isAbnormalityFormOpen ? "Đóng biểu mẫu" : "Báo bất thường"}
            </button>
          </div>
          {isAbnormalityFormOpen ? (
            <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Tiêu đề
                <input className="focus-ring min-h-11 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base" maxLength={200} onChange={(event) => setAbnormalityTitle(event.target.value)} value={abnormalityTitle} />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Vị trí
                <input className="focus-ring min-h-11 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base" maxLength={300} onChange={(event) => setAbnormalityLocation(event.target.value)} value={abnormalityLocation} />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Mức độ
                <select className="focus-ring min-h-11 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base" onChange={(event) => setAbnormalitySeverity(event.target.value as typeof abnormalitySeverity)} value={abnormalitySeverity}>
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="critical">Khẩn cấp</option>
                </select>
              </label>
              <label className="focus-ring flex min-h-11 cursor-pointer items-center border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold">
                Chọn ảnh ({abnormalityFiles.length}/5)
                <input
                  accept="image/*"
                  className="sr-only"
                  multiple
                  onChange={(event) => setAbnormalityFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                  type="file"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                Mô tả
                <Textarea maxLength={2000} onChange={(event) => setAbnormalityDescription(event.target.value)} value={abnormalityDescription} />
              </label>
              <button className="focus-ring pressable min-h-11 justify-self-start bg-[var(--danger-strong)] px-4 text-sm font-semibold text-[var(--on-danger)] disabled:opacity-60" disabled={abnormalityState === "sending" || abnormalityState === "sent"} onClick={() => void submitAbnormality()} type="button">
                {abnormalityState === "sending" ? "Đang gửi..." : abnormalityState === "sent" ? "Đã ghi nhận" : "Gửi bất thường"}
              </button>
              {abnormalityMessage ? <Alert className="sm:col-span-2" tone={abnormalityState === "error" ? "danger" : "success"}>{abnormalityMessage}</Alert> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {showDetails ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="focus-ring pressable inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--surface)] px-3 text-center text-sm font-semibold text-[var(--primary-strong)] hover:bg-[var(--primary-soft)] lg:min-h-10">
              {photoPaths.length > 0 ? "Thêm từ thư viện" : "Chọn từ thư viện"}
              <input
                accept="image/*"
                className="sr-only"
                multiple
                onChange={handlePhotoInput}
                type="file"
              />
            </label>
            <label className="focus-ring pressable inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-center text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] lg:min-h-10">
              Chụp ảnh
              <input
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handlePhotoInput}
                type="file"
              />
            </label>
            {isProcessingPhoto ? (
              <span className="text-sm font-semibold text-[var(--info)]">Đang xử lý ảnh...</span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Tối đa {MAX_PHOTOS_PER_REPORT} ảnh, mỗi ảnh nguồn tối đa {MAX_SOURCE_PHOTO_MEGABYTES}MB. Ảnh được thu về khoảng 1600px và nén JPEG trước khi gửi.
          </p>

          {visiblePhotoPreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visiblePhotoPreviews.map((photo, index) => (
                <div className="relative min-w-0" key={photo.source}>
                  <Image
                    alt={`Ảnh ghi nhận ${index + 1} cho ${task.tagname}`}
                    className="h-28 w-full rounded-[var(--radius-field)] border border-[var(--border)] object-cover"
                    height={160}
                    unoptimized
                    src={photo.url}
                    width={240}
                  />
                  <button
                    aria-label={`Xóa ảnh ${index + 1}`}
                    className="focus-ring pressable absolute right-1 top-1 min-h-11 min-w-11 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] text-sm font-medium text-[var(--danger)] shadow-sm"
                    onClick={() => removePhoto(photo.source)}
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {photoError ? <Alert className="mt-2">{photoError}</Alert> : null}
        </div>
      ) : null}
    </div>
  );
};
