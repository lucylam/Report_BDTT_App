"use client";

import Image from "next/image";
import { useState } from "react";
import { Alert, Textarea } from "@/components/ui";
import { SaveStatus } from "@/components/worker/SaveStatus";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import { compressPhotoToDataUrl } from "@/lib/photo";
import { percentOptions } from "@/lib/progress";
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
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const percent = progress?.percent ?? 0;
  const [manualState, setManualState] = useState<{
    readonly taskId: string;
    readonly value: string;
  }>({ taskId: task.id, value: String(percent) });
  const manualPercent =
    manualState.taskId === task.id ? manualState.value : String(percent);
  const note = progress?.note ?? "";
  const photoPath = progress?.photoPath;
  const isManualPercent = !percentOptions.includes(percent);

  const stageChange = (
    nextPercent: ProgressPercent,
    nextNote = note,
    nextPhotoPath = photoPath
  ): void => {
    onChange({ percent: nextPercent, note: nextNote, photoPath: nextPhotoPath });
  };

  const stageManualPercent = (value: string): void => {
    setManualState({ taskId: task.id, value });
    if (value.trim() === "") return;
    const nextPercent = Number(value);
    if (!Number.isFinite(nextPercent)) return;
    stageChange(Math.max(0, Math.min(100, Math.round(nextPercent))));
  };

  const handlePhoto = (file: File): void => {
    setPhotoError("");
    setIsProcessingPhoto(true);
    void compressPhotoToDataUrl(file)
      .then((dataUrl) => {
        stageChange(percent, note, dataUrl);
      })
      .catch((error: unknown) => {
        console.error("[ProgressEditor.handlePhoto]", error);
        setPhotoError(
          error instanceof Error ? error.message : "Không xử lý được ảnh."
        );
      })
      .finally(() => setIsProcessingPhoto(false));
  };

  const removePhoto = (): void => {
    stageChange(percent, note, undefined);
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
          className="control-pill grid grid-cols-3 gap-1 rounded-[var(--radius-field)] p-1 sm:grid-cols-6"
          role="group"
        >
          {percentOptions.map((option) => (
            <button
              aria-pressed={option === percent}
              className={`focus-ring pressable min-h-12 rounded-[calc(var(--radius-field)-0.25rem)] border text-sm font-semibold tabular-nums ${
                option === percent
                  ? "border-[var(--primary)] bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
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
          <label
            className={`flex min-h-12 min-w-0 items-center rounded-[calc(var(--radius-field)-0.25rem)] border bg-[var(--surface)] px-2 shadow-sm transition focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[rgba(111,165,31,0.35)] ${
              isManualPercent
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                : "border-transparent text-[var(--foreground)]"
            }`}
          >
            <span className="sr-only">Nháº­p tiáº¿n Ä‘á»™ thá»§ cÃ´ng</span>
            <input
              aria-label="Nháº­p tiáº¿n Ä‘á»™ thá»§ cÃ´ng"
              className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold tabular-nums outline-none placeholder:text-[var(--text-soft)]"
              inputMode="numeric"
              max={100}
              min={0}
              onBlur={() => {
                if (manualPercent.trim() === "") {
                  setManualState({ taskId: task.id, value: String(percent) });
                }
              }}
              onChange={(event) => stageManualPercent(event.target.value)}
              placeholder="KhÃ¡c"
              type="number"
              value={manualPercent}
            />
            <span className="shrink-0 text-sm font-semibold">%</span>
          </label>
        </div>
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
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="focus-ring pressable inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--surface)] px-4 text-center text-sm font-semibold text-[var(--primary-strong)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--primary-soft)]">
              {photoPath ? "Thay ảnh" : "Chọn / chụp ảnh"}
              <input
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handlePhoto(file);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            {photoPath ? (
              <button
                className="focus-ring pressable min-h-12 min-w-0 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--danger)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--danger-soft)]"
                onClick={removePhoto}
                type="button"
              >
                Xóa ảnh
              </button>
            ) : null}
            {isProcessingPhoto ? (
              <span className="text-sm font-semibold text-[var(--info)]">Đang xử lý ảnh...</span>
            ) : null}
          </div>

          {photoPath ? (
            <Image
              alt={`Ảnh ghi nhận cho ${task.tagname}`}
              className="mt-3 h-36 w-full rounded-[var(--radius-field)] border border-[var(--border)] object-cover shadow-sm lg:h-56"
              height={224}
              unoptimized
              src={photoPath}
              width={640}
            />
          ) : null}
          {photoError ? <Alert className="mt-2">{photoError}</Alert> : null}
        </div>
      ) : null}
    </div>
  );
};
