"use client";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_WIDTH = 1280;
const JPEG_QUALITY = 0.78;

const readImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh."));
    image.src = URL.createObjectURL(file);
  });
};

const canvasToDataUrl = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
};

export const compressPhotoToDataUrl = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Chỉ hỗ trợ file ảnh.");
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("Ảnh vượt quá 5MB.");
  }

  const image = await readImage(file);
  const scale = Math.min(1, MAX_PHOTO_WIDTH / image.width);
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
  URL.revokeObjectURL(image.src);
  return canvasToDataUrl(canvas);
};
