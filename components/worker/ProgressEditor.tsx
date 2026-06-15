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
  const note = progress?.note ?? "";
  const photoPath = progress?.photoPath;

  const stageChange = (
    nextPercent: ProgressPercent,
    nextNote = note,
    nextPhotoPath = photoPath
  ): void => {
    onChange({ percent: nextPercent, note: nextNote, photoPath: nextPhotoPath });
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
          className="control-pill grid grid-cols-5 gap-1 rounded-[var(--radius-field)] p-1"
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
              onClick={() => stageChange(option)}
              type="button"
            >
              {option}%
            </button>
          ))}
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
            <label className="focus-ring pressable inline-flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--primary-strong)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--primary-soft)]">
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
                className="focus-ring pressable min-h-12 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--danger)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--danger-soft)]"
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
