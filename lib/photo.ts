"use client";

import { isOfflinePhotoReference, readOfflinePhoto } from "@/lib/offlinePhotoStore";

export const MAX_SOURCE_PHOTO_MEGABYTES = 25;
export const MAX_SOURCE_PHOTO_BYTES = MAX_SOURCE_PHOTO_MEGABYTES * 1024 * 1024;
export const MAX_COMPRESSED_PHOTO_BYTES = Math.round(1.25 * 1024 * 1024);
export const MAX_PHOTOS_PER_REPORT = 5;

const MAX_PHOTO_EDGE = 1600;
const JPEG_QUALITIES = [0.8, 0.68, 0.56] as const;

const readImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không đọc được ảnh."));
    };
    image.src = objectUrl;
  });
};

export const getPhotoDataUrlSizeBytes = (dataUrl: string): number => {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0) return 0;
  const base64 = dataUrl.slice(separatorIndex + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

export const compressPhotoToDataUrl = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Chỉ hỗ trợ file ảnh.");
  }
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error(`Ảnh nguồn vượt quá ${MAX_SOURCE_PHOTO_MEGABYTES}MB. Hãy chọn ảnh nhỏ hơn.`);
  }

  const image = await readImage(file);
  try {
    const scale = Math.min(1, MAX_PHOTO_EDGE / image.width, MAX_PHOTO_EDGE / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Không tạo được canvas để nén ảnh.");
    }
    context.drawImage(image, 0, 0, width, height);

    for (const quality of JPEG_QUALITIES) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (getPhotoDataUrlSizeBytes(dataUrl) <= MAX_COMPRESSED_PHOTO_BYTES) {
        return dataUrl;
      }
    }
  } finally {
    URL.revokeObjectURL(image.src);
  }

  throw new Error("Không thể tối ưu ảnh về dung lượng an toàn. Hãy chọn ảnh có độ phân giải thấp hơn.");
};

export const isInlinePhotoPath = (value: string | undefined): boolean =>
  Boolean(value?.startsWith("data:"));

export const isAbsolutePhotoUrl = (value: string | undefined): boolean =>
  Boolean(value?.startsWith("http://") || value?.startsWith("https://"));

export const getProgressPhotoPaths = (progress: {
  readonly photoPath?: string;
  readonly photoPaths?: readonly string[];
} | null | undefined): string[] => {
  const paths = [...(progress?.photoPaths ?? [])].filter(Boolean);
  if (progress?.photoPath && !paths.includes(progress.photoPath)) {
    paths.unshift(progress.photoPath);
  }
  return paths.slice(0, MAX_PHOTOS_PER_REPORT);
};

export const resolvePhotoPreviewUrl = async (photoPath: string): Promise<string> => {
  if (isOfflinePhotoReference(photoPath)) {
    return readOfflinePhoto(photoPath);
  }
  if (isInlinePhotoPath(photoPath) || isAbsolutePhotoUrl(photoPath)) {
    return photoPath;
  }

  const response = await fetch(
    `/api/photos/signed-url?path=${encodeURIComponent(photoPath)}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { readonly error?: string }
      | null;
    throw new Error(result?.error || "Khong tai duoc anh.");
  }

  const result = (await response.json()) as { readonly signedUrl?: string };
  if (!result.signedUrl) {
    throw new Error("Khong nhan duoc signed URL cho anh.");
  }
  return result.signedUrl;
};
