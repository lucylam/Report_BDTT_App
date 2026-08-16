import Link from "next/link";

export type WorkOrderTab = "tasks" | "personnel" | "abnormalities" | "issues";

const tabs: readonly { readonly key: WorkOrderTab; readonly label: string }[] = [
  { key: "tasks", label: "Công việc" },
  { key: "personnel", label: "Nhân sự" },
  { key: "abnormalities", label: "Bất thường" },
  { key: "issues", label: "Báo sai dữ liệu" }
];

export const WorkOrderTabs = ({ active }: { readonly active: WorkOrderTab }): React.ReactElement => (
  <nav
    aria-label="Các chức năng WorkOrder"
    className="control-pill flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-field)] p-1"
  >
    {tabs.map((tab) => (
      <Link
        aria-current={active === tab.key ? "page" : undefined}
        className={`focus-ring pressable min-h-11 shrink-0 rounded-[calc(var(--radius-field)-0.2rem)] px-3 py-2.5 text-sm font-semibold no-underline transition ${
          active === tab.key
            ? "bg-[var(--foreground)] text-[var(--surface)] shadow-sm"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        }`}
        href={tab.key === "tasks" ? "/admin/tasks" : `/admin/tasks?tab=${tab.key}`}
        key={tab.key}
      >
        {tab.label}
      </Link>
    ))}
  </nav>
);
