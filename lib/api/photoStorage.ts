import type { UserRole } from "@/types/domain";

export const TASK_PHOTOS_BUCKET = "task-photos";
export const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024;
export const SIGNED_PHOTO_URL_TTL_SECONDS = 5 * 60;

const DATA_URL_PREFIX = "data:";
const PHOTO_DATA_URL_PATTERN = /^data:(image\/jpeg);base64,([A-Za-z0-9+/=]+)$/;

export interface ParsedPhotoDataUrl {
  readonly mimeType: "image/jpeg";
  readonly bytes: Buffer;
}

export const isInlinePhotoDataUrl = (value: string | undefined): boolean =>
  Boolean(value?.startsWith(DATA_URL_PREFIX));

export const isAbsolutePhotoUrl = (value: string | undefined): boolean =>
  Boolean(value?.startsWith("http://") || value?.startsWith("https://"));

export const parsePhotoDataUrl = (value: string): ParsedPhotoDataUrl => {
  const match = value.match(PHOTO_DATA_URL_PATTERN);
  if (!match) {
    throw new Error("Anh phai la data URL JPEG hop le.");
  }

  const bytes = Buffer.from(match[2] ?? "", "base64");
  if (bytes.length === 0) {
    throw new Error("Anh khong co du lieu.");
  }
  if (bytes.length > MAX_PHOTO_UPLOAD_BYTES) {
    throw new Error("Anh vuot qua 5MB.");
  }

  return { mimeType: "image/jpeg", bytes };
};

const safePathPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export const createTaskPhotoPath = ({
  profileId,
  reportDate,
  taskId,
  trialRunId,
  timestamp = new Date()
}: {
  readonly profileId: string;
  readonly reportDate: string;
  readonly taskId: string;
  readonly trialRunId?: string | null;
  readonly timestamp?: Date;
}): string => {
  const stampedAt = timestamp.toISOString().replace(/[:.]/g, "-");
  const basePath = `${safePathPart(profileId)}/${safePathPart(taskId)}/${safePathPart(reportDate)}-${stampedAt}.jpg`;
  return trialRunId
    ? `trials/${safePathPart(trialRunId)}/${basePath}`
    : basePath;
};

export const canAccessPhotoPath = (
  profile: { readonly id: string; readonly role: UserRole },
  photoPath: string
): boolean => {
  if (profile.role === "admin") return true;
  const pathParts = photoPath.split("/");
  const ownerId = pathParts[0] === "trials" ? pathParts[2] : pathParts[0];
  return ownerId === profile.id;
};
