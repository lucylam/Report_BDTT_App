export type ProgressPercent = number;

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
  readonly password: string;
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
  readonly submittedAt?: string;
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
  readonly id: string;
  readonly taskId: string;
  readonly userId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
  readonly queuedAt: string;
}

export interface AppData {
  readonly accounts: AuthAccount[];
  readonly profiles: Profile[];
  readonly tasks: Task[];
  readonly progress: ProgressRecord[];
  readonly dailySnapshots: DailySnapshot[];
  readonly offlineQueue: QueuedProgressUpdate[];
  readonly activeUserId: string | null;
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
