import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { cuMinhThanhTasks } from "@/lib/generated/cuMinhThanhTasks";
import type { AppData, ProgressRecord, Task } from "@/types/domain";

const accounts = createSeedAccounts();
const profiles = createProfilesFromAccounts(accounts);

export const demoProfiles = profiles;

const otherDemoTasks: readonly Task[] = [
  {
    id: "task-29pxt-1012b",
    stt: 5,
    taskName: "Trung tu:12 mths for 29PXT-1012B",
    wo: "100000164072",
    tagname: "29PXT-1012B",
    nhom: "DK- AMLL",
    donVi: "UTILITY",
    section: "29000",
    duration: "10 hrs",
    priority: 1,
    startDate: "2025-08-22",
    finishDate: "2025-08-22",
    resourceName: "AMLL_TRINH PHUOC TUNG",
    nhomTruong: "TB DO_NGUYEN THANH HAI",
    assignedTo: "user-tungtp",
    isCancelled: false,
    cancelReason: ""
  },
  {
    id: "task-04pdt-2063",
    stt: 2,
    taskName: "Trung tu:36 months, PM for 04PDT-2063",
    wo: "100000131614",
    tagname: "04PDT-2063",
    nhom: "DK- AMLL",
    donVi: "AMONIA",
    section: "4200",
    duration: "10 hrs",
    priority: 3,
    startDate: "2025-08-20",
    finishDate: "2025-08-20",
    resourceName: "AMLL_TRAN KHANH HOA",
    nhomTruong: "TB DO_NGUYEN THANH HAI",
    assignedTo: "user-hoatk",
    isCancelled: false,
    cancelReason: ""
  }
];

export const demoTasks: readonly Task[] = [
  ...cuMinhThanhTasks,
  ...otherDemoTasks
];

export const demoProgress: readonly ProgressRecord[] = [
  {
    taskId: "task-3-41pt-1007",
    userId: "user-thanhcm",
    reportDate: DEFAULT_REPORT_DATE,
    percent: 100,
    note: "Hoan thanh, khong phat sinh",
    submittedAt: "2025-08-22T09:41:00+07:00"
  },
  {
    taskId: "task-4-41pt-1005",
    userId: "user-thanhcm",
    reportDate: DEFAULT_REPORT_DATE,
    percent: 75,
    note: "Dang kiem tra tin hieu",
    submittedAt: "2025-08-22T09:42:00+07:00"
  },
  {
    taskId: "task-29pxt-1012b",
    userId: "user-tungtp",
    reportDate: DEFAULT_REPORT_DATE,
    percent: 50,
    note: "Dang dau noi",
    submittedAt: "2025-08-22T09:35:00+07:00"
  }
];

export const createDemoData = (): AppData => {
  return {
    accounts: [...accounts],
    profiles: [...demoProfiles],
    tasks: [...demoTasks],
    progress: [...demoProgress],
    dailySnapshots: [],
    offlineQueue: [],
    activeUserId: null
  };
};
