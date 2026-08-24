"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, Field, Icon, Input, Select, Textarea } from "@/components/ui";
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
  const photoHint = `Tối đa ${MAX_PHOTOS_PER_REPORT} ảnh, mỗi ảnh nguồn tối đa ${MAX_SOURCE_PHOTO_MEGABYTES}MB. Ảnh được thu về khoảng 1600px và nén JPEG trước khi gửi.`;
  const photoHintId = `photo-hint-${task.id}`;

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

  const closeAbnormalityDialog = useCallback((): void => {
    setIsAbnormalityFormOpen(false);
  }, []);

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
          className="control-pill grid gap-1 rounded-[var(--radius-field)] p-1"
          role="group"
        >
          <div className={`grid gap-1 ${task.progressMode === "binary" ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-5"}`}>
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
          </div>
          {task.progressMode !== "binary" ? <label
            className={`flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-2 rounded-[calc(var(--radius-field)-0.25rem)] border bg-[var(--surface)] px-3 shadow-sm transition focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[rgba(111,165,31,0.35)] lg:min-h-9 ${
              isManualPercent
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                : "border-transparent text-[var(--foreground)]"
            }`}
          >
            <span className="text-sm font-semibold text-[var(--text-muted)]">Nhập thủ công</span>
            <span className="flex min-w-24 flex-1 items-center sm:max-w-32">
              <input
                aria-label="Nhập tiến độ thủ công"
                className="min-w-0 flex-1 bg-transparent text-right text-base font-semibold tabular-nums outline-none placeholder:text-[var(--text-soft)]"
                inputMode="numeric"
                max={100}
                min={0}
                onBlur={() => {
                  if (manualPercent.trim() === "") {
                    setManualState({ taskId: task.id, value: String(percent) });
                  }
                }}
                onChange={(event) => stageManualPercent(event.target.value)}
                placeholder="0–100"
                type="number"
                value={manualPercent}
              />
              <span className="ml-1 shrink-0 text-base font-semibold">%</span>
            </span>
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
        <section className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              aria-expanded={isIssueFormOpen}
              className={`focus-ring pressable inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--warning)] px-3 text-center text-sm font-semibold leading-5 text-[var(--warning-strong)] ${
                isIssueFormOpen
                  ? "bg-[var(--warning-soft)]"
                  : "bg-[var(--surface)] hover:bg-[var(--warning-soft)]"
              }`}
              onClick={() => setIsIssueFormOpen((current) => !current)}
              type="button"
            >
              <Icon name="data" />
              <span>Báo sai dữ liệu</span>
            </button>
            <button
              aria-expanded={isAbnormalityFormOpen}
              aria-haspopup="dialog"
              className={`focus-ring pressable inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--danger)] px-3 text-center text-sm font-semibold leading-5 text-[var(--danger-strong)] ${
                isAbnormalityFormOpen
                  ? "bg-[var(--danger-soft)]"
                  : "bg-[var(--surface)] hover:bg-[var(--danger-soft)]"
              }`}
              onClick={() => {
                setIsIssueFormOpen(false);
                setIsAbnormalityFormOpen(true);
              }}
              type="button"
            >
              <Icon name="bell" />
              <span>Báo bất thường</span>
            </button>
          </div>

          {isIssueFormOpen ? (
            <div className="glass-card grid gap-3 rounded-[var(--radius-card)] p-4">
              <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
                Loại dữ liệu cần kiểm tra
                <select
                  className="focus-ring min-h-11 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base"
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
                  className="focus-ring min-h-11 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-base font-normal"
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
                className="focus-ring pressable min-h-11 justify-self-start rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-4 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
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

      {showDetails && isAbnormalityFormOpen ? (
        <Dialog
          className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-2xl"
          description={`Hạng mục ${task.tagname} · ${task.wo}. Hồ sơ sẽ được gửi riêng đến người giám sát.`}
          eyebrow="Ghi nhận bất thường"
          eyebrowTone="danger"
          onClose={closeAbnormalityDialog}
          title="Báo bất thường"
        >
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAbnormality();
            }}
          >
            <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase text-[var(--danger-strong)]">Hạng mục đang báo cáo</p>
              <p className="mt-1 break-words text-base font-semibold text-[var(--foreground)]">{task.taskName}</p>
              <p className="mt-1 break-words text-sm font-medium text-[var(--text-muted)]">
                Tag {task.tagname} · WorkOrder {task.wo}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Tiêu đề">
                <Input
                  maxLength={200}
                  minLength={3}
                  onChange={(event) => setAbnormalityTitle(event.target.value)}
                  placeholder="Tóm tắt dấu hiệu bất thường"
                  required
                  value={abnormalityTitle}
                />
              </Field>
              <Field label="Vị trí">
                <Input
                  maxLength={300}
                  onChange={(event) => setAbnormalityLocation(event.target.value)}
                  placeholder="Khu vực hoặc vị trí thiết bị"
                  value={abnormalityLocation}
                />
              </Field>
              <Field label="Mức độ">
                <Select
                  onChange={(event) => setAbnormalitySeverity(event.target.value as typeof abnormalitySeverity)}
                  value={abnormalitySeverity}
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="critical">Khẩn cấp</option>
                </Select>
              </Field>
              <Field hint="Tối đa 5 ảnh." label="Ảnh hiện trường">
                <label className="focus-ring pressable flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon name="camera" />
                    <span className="break-words">Chọn ảnh</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-xs tabular-nums text-[var(--danger-strong)]">
                    {abnormalityFiles.length}/5
                  </span>
                  <input
                    accept="image/*"
                    className="sr-only"
                    multiple
                    onChange={(event) => setAbnormalityFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                    type="file"
                  />
                </label>
              </Field>
              <Field className="sm:col-span-2" label="Mô tả">
                <Textarea
                  className="min-h-36"
                  maxLength={2000}
                  onChange={(event) => setAbnormalityDescription(event.target.value)}
                  placeholder="Mô tả hiện tượng, thời điểm phát hiện và thông tin cần người giám sát lưu ý"
                  value={abnormalityDescription}
                />
              </Field>
            </div>

            {abnormalityMessage ? (
              <Alert className="mt-4" tone={abnormalityState === "error" ? "danger" : "success"}>
                {abnormalityMessage}
              </Alert>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
              <Button disabled={abnormalityState === "sending"} onClick={closeAbnormalityDialog} variant="secondary">
                Đóng
              </Button>
              <Button disabled={abnormalityState === "sending" || abnormalityState === "sent"} type="submit" variant="danger">
                <Icon name={abnormalityState === "sending" ? "loading" : abnormalityState === "sent" ? "check" : "bell"} className={abnormalityState === "sending" ? "motion-safe:animate-spin" : undefined} />
                {abnormalityState === "sending" ? "Đang gửi..." : abnormalityState === "sent" ? "Đã ghi nhận" : "Gửi bất thường"}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}

      {showDetails ? (
        <div>
          <div className="group/photo-actions relative">
            <div className="grid grid-cols-2 gap-2">
            <label
              className="focus-ring pressable inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--surface)] px-3 text-center text-sm font-semibold leading-5 text-[var(--primary-strong)] hover:bg-[var(--primary-soft)]"
            >
              <Icon name="upload" />
              {photoPaths.length > 0 ? "Thêm từ thư viện" : "Chọn từ thư viện"}
              <input
                accept="image/*"
                aria-describedby={photoHintId}
                className="sr-only"
                multiple
                onChange={handlePhotoInput}
                type="file"
              />
            </label>
            <label
              className="focus-ring pressable inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-center text-sm font-semibold leading-5 text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              <Icon name="camera" />
              Chụp ảnh
              <input
                accept="image/*"
                aria-describedby={photoHintId}
                capture="environment"
                className="sr-only"
                onChange={handlePhotoInput}
                type="file"
              />
            </label>
            {isProcessingPhoto ? (
              <span className="col-span-2 text-sm font-semibold text-[var(--info)]">Đang xử lý ảnh...</span>
            ) : null}
            </div>
            <span className="sr-only" id={photoHintId}>{photoHint}</span>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-30 invisible w-full translate-y-1 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--foreground)] px-3 py-2 text-xs font-medium leading-5 text-[var(--surface)] opacity-0 shadow-[var(--shadow-floating)] transition duration-150 group-hover/photo-actions:visible group-hover/photo-actions:translate-y-0 group-hover/photo-actions:opacity-100 group-focus-within/photo-actions:visible group-focus-within/photo-actions:translate-y-0 group-focus-within/photo-actions:opacity-100"
              role="tooltip"
            >
              {photoHint}
            </div>
          </div>

          {visiblePhotoPreviews.length > 0 ? (
            <div className="mobile-reflow-grid mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
