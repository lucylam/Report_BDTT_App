export type ProgressPercent = number;
export type ProgressMode = "continuous" | "binary";

export type UserRole = "admin" | "worker";

export type OrgRole =
  | "toTruong"
  | "nhomTruong"
  | "nhomPho"
  | "pnt"
  | "member"
  | "placeholder"
  | "supervisor";

export interface OrgMetadata {
  readonly orgGroup: string;
  readonly subgroup: string;
  readonly orgRole: OrgRole;
  readonly orgTitle: string;
  readonly orgAssignment: string;
  readonly managedGroups: readonly string[];
  readonly managedSubgroups: readonly string[];
  readonly isPlaceholder: boolean;
  readonly canLogin: boolean;
}

export interface Profile {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly resourceName: string;
  readonly nhom: string;
  readonly nhomTruong: string;
  readonly role: UserRole;
  readonly orgGroup: string;
  readonly subgroup: string;
  readonly orgRole: OrgRole;
  readonly orgTitle: string;
  readonly orgAssignment: string;
  readonly managedGroups: readonly string[];
  readonly managedSubgroups: readonly string[];
  readonly isPlaceholder: boolean;
  readonly canLogin: boolean;
  readonly mustChangePassword: boolean;
}

export interface AuthAccount {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly resourceName: string;
  readonly role: UserRole;
  readonly orgGroup: string;
  readonly subgroup: string;
  readonly orgRole: OrgRole;
  readonly orgTitle: string;
  readonly orgAssignment: string;
  readonly managedGroups: readonly string[];
  readonly managedSubgroups: readonly string[];
  readonly isPlaceholder: boolean;
  readonly canLogin: boolean;
  readonly password?: string;
  readonly mustChangePassword: boolean;
}

export interface Task {
  readonly id: string;
  readonly stt: number;
  readonly taskName: string;
  readonly wo: string;
  readonly tagname: string;
  readonly nhom: string;
  readonly donVi: string;
  readonly section: string;
  readonly duration: string;
  readonly priority: 1 | 2 | 3;
  readonly startDate: string;
  readonly finishDate: string;
  readonly resourceName: string;
  readonly nhomTruong: string;
  readonly assignedTo: string | null;
  readonly reporterId?: string | null;
  readonly taskSource?: "plan" | "ad_hoc";
  readonly progressMode?: ProgressMode;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly isCancelled: boolean;
  readonly cancelReason: string;
}

export interface ProgressRecord {
  readonly taskId: string;
  readonly userId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
  readonly photoPaths?: readonly string[];
  readonly submittedAt?: string;
  readonly submittedBy?: string;
}

export interface TaskReportHistoryItem {
  readonly id: string;
  readonly taskId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPaths: readonly string[];
  readonly actorId: string;
  readonly actorName: string;
  readonly actorUsername?: string;
  readonly createdAt: string;
}

export interface PlanVersion {
  readonly batchId: string;
  readonly fileName: string;
  readonly importedAt: string;
  readonly rowCount: number;
}

export type SheetSyncStatus = "never" | "synced" | "pending" | "failed";

export interface SheetSyncSummary {
  readonly status: SheetSyncStatus;
  readonly checksum: string;
  readonly lastSyncedChecksum?: string;
  readonly lastSyncedAt?: string;
  readonly lastError?: string;
  readonly rowCount: number;
}

export type DataIssueType = "wrong_tag" | "wrong_wo" | "wrong_assignment" | "other";
export type DataIssueStatus = "open" | "reviewing" | "resolved" | "rejected";

export interface DataIssueReport {
  readonly id: string;
  readonly taskId: string;
  readonly reportedBy: string;
  readonly issueType: DataIssueType;
  readonly currentValue: string;
  readonly suggestedValue: string;
  readonly note: string;
  readonly status: DataIssueStatus;
  readonly resolvedBy?: string;
  readonly resolutionNote: string;
  readonly reviewStartedAt?: string;
  readonly resolvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AbnormalitySeverity = "low" | "medium" | "high" | "critical";
export type AbnormalityStatus = "new" | "in_progress" | "resolved" | "closed";

export interface BdttAbnormality {
  readonly id: string;
  readonly taskId?: string;
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly severity: AbnormalitySeverity;
  readonly status: AbnormalityStatus;
  readonly reportedBy: string;
  readonly assignedTo?: string;
  readonly resolutionNote: string;
  readonly photoPaths: readonly string[];
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DailySnapshot {
  readonly snapshotDate: string;
  readonly totalTasks: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly overallPercent: number;
  readonly byGroup: Record<string, { readonly done: number; readonly total: number }>;
  readonly byUnit: Record<string, { readonly done: number; readonly total: number }>;
  readonly capturedAt: string;
}

export interface QueuedProgressUpdate {
  readonly kind: "progress";
  readonly id: string;
  readonly taskId: string;
  readonly userId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
  readonly photoPaths?: readonly string[];
  readonly queuedAt: string;
  readonly trialRunId?: string | null;
}

export interface QueuedCancelTaskUpdate {
  readonly kind: "cancelTask";
  readonly id: string;
  readonly taskId: string;
  readonly userId: string;
  readonly cancelReason: string;
  readonly queuedAt: string;
  readonly trialRunId?: string | null;
}

export type OfflineQueueItem = QueuedProgressUpdate | QueuedCancelTaskUpdate;

export interface AppData {
  readonly accounts: AuthAccount[];
  readonly profiles: Profile[];
  readonly tasks: Task[];
  readonly progress: ProgressRecord[];
  readonly dailySnapshots: DailySnapshot[];
  readonly offlineQueue: OfflineQueueItem[];
  readonly activeUserId: string | null;
  readonly planVersion?: PlanVersion;
  readonly trialRun?: {
    readonly id: string;
    readonly name: string;
    readonly startedAt: string;
  };
}

export interface ImportPreview {
  readonly tasks: Task[];
  readonly profiles: Profile[];
  readonly rowCount: number;
  readonly unmappedResourceNames: string[];
  readonly missingColumns: string[];
}

export interface DashboardMetrics {
  readonly totalTasks: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly cancelled: number;
  readonly unsubmittedWorkers: number;
  readonly priorityOpen: number;
  readonly overdue: number;
  readonly overallPercent: number;
}
