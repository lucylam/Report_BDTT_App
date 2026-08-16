"use client";

import type { BadgeTone } from "@/components/ui";
import type { AuthAccount, Profile } from "@/types/domain";

const AM_STORAGE_KEY = "bdtt-am-activities-v1";

export type AmActivityStatus =
  | "assigned"
  | "inProgress"
  | "submitted"
  | "needsRevision"
  | "approved";

export type AmModuleRole =
  | "leader"
  | "member"
  | "workshop_manager"
  | "web_admin";

export interface AmPhoto {
  readonly id: string;
  readonly url: string;
  readonly uploadedBy: string;
  readonly createdAt: string;
}

export interface AmEvent {
  readonly id: string;
  readonly taskId: string;
  readonly eventType: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface AmPerson {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly orgTitle: string;
  readonly canLogin: boolean;
  readonly amRole?: AmModuleRole;
}

export interface AmPermissions {
  readonly role: AmModuleRole | null;
  readonly canAccess: boolean;
  readonly canManageTeam: boolean;
  readonly canAssign: boolean;
  readonly canAssignOutsideTeam: boolean;
  readonly canReview: boolean;
  readonly canViewAll: boolean;
}

export interface AmActivity {
  readonly id: string;
  readonly requestContent: string;
  readonly locationTag: string;
  readonly assigneeIds: readonly string[];
  readonly scheduledDate: string;
  readonly status: AmActivityStatus;
  readonly beforePhotos: readonly AmPhoto[];
  readonly afterPhotos: readonly AmPhoto[];
  readonly performerNote: string;
  readonly supervisorNote: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedAt?: string;
  readonly approvedAt?: string;
  readonly submittedBy?: string;
  readonly approvedBy?: string;
  readonly events: readonly AmEvent[];
}

export interface CreateAmActivityInput {
  readonly requestContent: string;
  readonly locationTag: string;
  readonly assigneeIds: readonly string[];
  readonly scheduledDate: string;
  readonly createdBy: string;
}

export interface AmStatusMeta {
  readonly label: string;
  readonly tone: BadgeTone;
}

export interface AmActivityKpis {
  readonly total: number;
  readonly assigned: number;
  readonly inProgress: number;
  readonly submitted: number;
  readonly needsRevision: number;
  readonly approved: number;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isAmActivityStatus = (value: unknown): value is AmActivityStatus =>
  value === "assigned" ||
  value === "inProgress" ||
  value === "submitted" ||
  value === "needsRevision" ||
  value === "approved";

const normalizePhotoList = (value: unknown): AmPhoto[] =>
  Array.isArray(value)
    ? value
        .map((item, index): AmPhoto | null => {
          if (typeof item === "string" && item.startsWith("data:image/")) {
            return {
              id: `legacy-${index}`,
              url: item,
              uploadedBy: "",
              createdAt: new Date(0).toISOString()
            };
          }
          if (!item || typeof item !== "object") return null;
          const photo = item as Record<string, unknown>;
          const id = normalizeText(photo.id);
          const url = normalizeText(photo.url);
          if (!id || !url) return null;
          return {
            id,
            url,
            uploadedBy: normalizeText(photo.uploadedBy),
            createdAt: normalizeText(photo.createdAt) || new Date(0).toISOString()
          };
        })
        .filter((item): item is AmPhoto => Boolean(item))
    : [];

const normalizeActivity = (value: unknown): AmActivity | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const id = normalizeText(candidate.id);
  const requestContent = normalizeText(candidate.requestContent);
  const scheduledDate = normalizeText(candidate.scheduledDate);
  const assigneeIds = Array.isArray(candidate.assigneeIds)
    ? candidate.assigneeIds.map(normalizeText).filter(Boolean)
    : [];

  if (!id || !requestContent || !scheduledDate || assigneeIds.length === 0) {
    return null;
  }

  return {
    id,
    requestContent,
    locationTag: normalizeText(candidate.locationTag),
    assigneeIds,
    scheduledDate,
    status: isAmActivityStatus(candidate.status) ? candidate.status : "assigned",
    beforePhotos: normalizePhotoList(candidate.beforePhotos),
    afterPhotos: normalizePhotoList(candidate.afterPhotos),
    performerNote: normalizeText(candidate.performerNote),
    supervisorNote: normalizeText(candidate.supervisorNote),
    createdBy: normalizeText(candidate.createdBy),
    createdAt: normalizeText(candidate.createdAt) || new Date(0).toISOString(),
    updatedAt: normalizeText(candidate.updatedAt) || new Date(0).toISOString(),
    submittedAt: normalizeText(candidate.submittedAt) || undefined,
    approvedAt: normalizeText(candidate.approvedAt) || undefined,
    submittedBy: normalizeText(candidate.submittedBy) || undefined,
    approvedBy: normalizeText(candidate.approvedBy) || undefined,
    events: []
  };
};

export const loadAmActivities = (): AmActivity[] => {
  if (typeof window === "undefined") return [];

  const rawValue = window.localStorage.getItem(AM_STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeActivity)
          .filter((activity): activity is AmActivity => Boolean(activity))
      : [];
  } catch (error) {
    console.error("[loadAmActivities]", error);
    return [];
  }
};

export const saveAmActivities = (activities: readonly AmActivity[]): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AM_STORAGE_KEY, JSON.stringify(activities));
};

export const createAmActivity = ({
  requestContent,
  locationTag,
  assigneeIds,
  scheduledDate,
  createdBy
}: CreateAmActivityInput): AmActivity => {
  const now = new Date().toISOString();
  return {
    id: `am-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requestContent: requestContent.trim(),
    locationTag: locationTag.trim(),
    assigneeIds: [...assigneeIds],
    scheduledDate,
    status: "assigned",
    beforePhotos: [],
    afterPhotos: [],
    performerNote: "",
    supervisorNote: "",
    createdBy,
    createdAt: now,
    updatedAt: now,
    events: []
  };
};

export const getNextReportStatus = (
  beforePhotos: readonly unknown[],
  afterPhotos: readonly unknown[],
  currentStatus: AmActivityStatus
): AmActivityStatus => {
  if (currentStatus === "approved") return currentStatus;
  if (beforePhotos.length > 0 || afterPhotos.length > 0) return "inProgress";
  return currentStatus === "needsRevision" ? "needsRevision" : "assigned";
};

export const getAmStatusMeta = (status: AmActivityStatus): AmStatusMeta => {
  if (status === "approved") return { label: "Đạt", tone: "success" };
  if (status === "submitted") return { label: "Chờ duyệt", tone: "info" };
  if (status === "needsRevision") return { label: "Bổ sung", tone: "warning" };
  if (status === "inProgress") return { label: "Đang làm", tone: "accent" };
  return { label: "Đã giao", tone: "primary" };
};

export const getAmActivityKpis = (
  activities: readonly AmActivity[]
): AmActivityKpis => ({
  total: activities.length,
  assigned: activities.filter((item) => item.status === "assigned").length,
  inProgress: activities.filter((item) => item.status === "inProgress").length,
  submitted: activities.filter((item) => item.status === "submitted").length,
  needsRevision: activities.filter((item) => item.status === "needsRevision").length,
  approved: activities.filter((item) => item.status === "approved").length
});

export const canManageAmActivities = (account: AuthAccount): boolean =>
  account.role === "admin";

export const getProfileName = (
  profiles: readonly Pick<Profile, "id" | "fullName">[],
  profileId: string
): string => profiles.find((profile) => profile.id === profileId)?.fullName ?? profileId;

export const getAssigneeNames = (
  profiles: readonly Pick<Profile, "id" | "fullName">[],
  assigneeIds: readonly string[]
): string => assigneeIds.map((id) => getProfileName(profiles, id)).join("; ");
