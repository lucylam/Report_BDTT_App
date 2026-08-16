import type { IconName } from "@/components/ui";

export type PortalModuleKey = string;

export interface PortalModuleDefinition {
  readonly key: PortalModuleKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly icon: IconName;
  readonly adminHref: string;
  readonly workerHref: string;
  readonly defaultAccess?: boolean;
}

export interface AccessiblePortalModule extends PortalModuleDefinition {
  readonly href: string;
  readonly role?: string;
}

export const PORTAL_MODULES: readonly PortalModuleDefinition[] = [
  {
    key: "bdtt",
    label: "Bảo dưỡng tổng thể",
    shortLabel: "BDTT",
    description: "Cập nhật tiến độ, giám sát WorkOrder, nhân sự, DATA và báo cáo.",
    icon: "workorder",
    adminHref: "/admin",
    workerHref: "/worker",
    defaultAccess: true
  },
  {
    key: "am",
    label: "Công tác AM",
    shortLabel: "AM",
    description: "Giao việc, ảnh trước/sau, báo cáo, duyệt và thông báo cho Tổ AM.",
    icon: "calendar",
    adminHref: "/am",
    workerHref: "/am"
  }
] as const;

export const getPortalModule = (
  key: string
): PortalModuleDefinition | undefined =>
  PORTAL_MODULES.find((module) => module.key === key);

export const getPortalModuleHref = (
  moduleOrKey: PortalModuleDefinition | string,
  accountRole: "admin" | "worker"
): string => {
  const definition =
    typeof moduleOrKey === "string" ? getPortalModule(moduleOrKey) : moduleOrKey;
  if (!definition) return "/";
  return accountRole === "admin" ? definition.adminHref : definition.workerHref;
};

export const getNotificationHref = (
  moduleKey: string,
  entityId?: string,
  explicitHref?: string
): string => {
  if (explicitHref?.startsWith("/")) return explicitHref;
  if (moduleKey === "am") {
    return entityId ? `/am?task=${encodeURIComponent(entityId)}` : "/am";
  }
  if (moduleKey === "bdtt") return "/";
  const definition = getPortalModule(moduleKey);
  return definition?.workerHref ?? `/${encodeURIComponent(moduleKey)}`;
};
