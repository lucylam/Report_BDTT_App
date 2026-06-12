"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [note, setNote] = useState<string>(progress?.note ?? "");
  const [photoPath, setPhotoPath] = useState<string | undefined>(progress?.photoPath);
  const [photoError, setPhotoError] = useState<string>("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const percent = progress?.percent ?? 0;

  const saveChange = (
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
        setPhotoPath(dataUrl);
        saveChange(percent, note, dataUrl);
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
    setPhotoPath(undefined);
    saveChange(percent, note, undefined);
  };

  return (
    <div className={density === "compact" ? "space-y-3" : "space-y-4"}>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold text-[var(--primary-strong)]">
            Cập nhật tiến độ
          </span>
          <SaveStatus state={saveState} />
        </div>
        <div
          aria-label={`Chọn phần trăm hoàn thành cho ${task.tagname}`}
          className="control-pill grid grid-cols-5 gap-1 rounded-full p-1"
          role="group"
        >
          {percentOptions.map((option) => (
            <button
              aria-pressed={option === percent}
              className={`focus-ring pressable min-h-12 rounded-full border text-sm font-extrabold tabular-nums ${
                option === percent
                  ? "border-[var(--primary)] bg-[var(--primary-strong)] text-white shadow-md"
                  : "border-transparent bg-white/72 text-slate-800 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              key={option}
              onClick={() => saveChange(option)}
              type="button"
            >
              {option}%
            </button>
          ))}
        </div>
      </div>

      {showDetails ? (
        <label className="block">
          <span className="text-sm font-extrabold text-slate-800">Ghi chú</span>
          <textarea
            className="focus-ring mt-2 min-h-24 w-full resize-y rounded-[var(--radius-field)] border border-[var(--border)] bg-white/88 px-4 py-3 text-base font-medium leading-6 text-[var(--foreground)] shadow-sm placeholder:text-slate-500"
            onBlur={() => saveChange(percent)}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi chú vấn đề phát sinh..."
            value={note}
          />
        </label>
      ) : null}

      {showDetails ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="focus-ring pressable inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-[var(--primary)] bg-white px-4 text-sm font-extrabold text-[var(--primary-strong)] shadow-sm hover:bg-[var(--primary-soft)]">
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
                className="focus-ring pressable min-h-12 rounded-full border border-[var(--danger)] bg-white px-4 text-sm font-extrabold text-[var(--danger)] shadow-sm hover:bg-[var(--danger-soft)]"
                onClick={removePhoto}
                type="button"
              >
                Xóa ảnh
              </button>
            ) : null}
            {isProcessingPhoto ? (
              <span className="text-sm font-bold text-[var(--info)]">Đang xử lý ảnh...</span>
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
          {photoError ? (
            <p className="mt-2 rounded-[var(--radius-field)] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
              {photoError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
