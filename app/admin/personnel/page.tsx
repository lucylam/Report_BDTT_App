"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PersonnelEditorDialog } from "@/components/admin/personnel/PersonnelEditorDialog";
import { PersonnelOrgChart } from "@/components/admin/personnel/PersonnelOrgChart";
import {
  Alert,
  AppLoadingState,
  CompactMetricStrip,
  Icon,
  Input,
  type IconName
} from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";
import { canManagePersonnelOrg } from "@/lib/permissions";
import type { Profile } from "@/types/domain";

const AdminPersonnelPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout, refreshRemoteData } = useAppData();
  const [query, setQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  const profiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.profiles ?? [])
      .filter((profile) => !profile.isPlaceholder)
      .filter((profile) => {
        if (!normalizedQuery) return true;
        return [
          profile.fullName,
          profile.username,
          profile.employeeCode,
          profile.orgGroup,
          profile.subgroup,
          profile.orgTitle
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [data?.profiles, query]);

  if (!data || !currentAccount || currentAccount.mustChangePassword) {
    return (
      <AppLoadingState
        description="Đang chuẩn bị cơ cấu nhóm, phân nhóm và vai trò quản lý."
        icon="people"
        title="Đang tải sơ đồ nhân sự"
      />
    );
  }

  if (!canManagePersonnelOrg(currentAccount)) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <section className="glass-card max-w-md rounded-[var(--radius-card)] p-6">
          <h1 className="text-xl font-semibold">Không có quyền quản trị nhân sự</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Chức năng sơ đồ và điều chuyển nhân sự chỉ dành cho vinhlpp và kiaq.
          </p>
          <Link className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-4 text-sm font-semibold text-[var(--primary-contrast)] no-underline" href="/admin">
            Về tổng quan
          </Link>
        </section>
      </main>
    );
  }

  const allProfiles = data.profiles.filter((profile) => !profile.isPlaceholder);
  const leaders = allProfiles.filter((profile) =>
    ["toTruong", "nhomTruong", "nhomPho", "supervisor"].includes(profile.orgRole)
  ).length;
  const pnt = allProfiles.filter((profile) => profile.orgRole === "pnt").length;
  const groups = new Set(allProfiles.map((profile) => profile.orgGroup).filter(Boolean)).size;

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle="Sơ đồ tổ chức, luân chuyển nhóm và phân quyền nhân sự BDTT"
      title="Quản trị nhân sự"
    >
      <CompactMetricStrip
        ariaLabel="Tổng hợp cơ cấu nhân sự"
        className="lg:hidden"
        columns={4}
        items={[
          { icon: "people", key: "personnel", label: "Nhân sự", tone: "info", value: allProfiles.length },
          { icon: "workorder", key: "groups", label: "Nhóm công tác", shortLabel: "Nhóm", value: groups },
          { icon: "shield", key: "leaders", label: "Cấp quản lý", shortLabel: "Quản lý", tone: "primary", value: leaders },
          { icon: "account", key: "pnt", label: "PNT", tone: "warning", value: pnt }
        ]}
      />

      <section className="hidden grid-cols-2 gap-3 lg:grid xl:grid-cols-4">
        <PersonnelMetric icon="people" label="Nhân sự" tone="info" value={allProfiles.length} />
        <PersonnelMetric icon="workorder" label="Nhóm công tác" tone="neutral" value={groups} />
        <PersonnelMetric icon="shield" label="Cấp quản lý" tone="primary" value={leaders} />
        <PersonnelMetric icon="account" label="PNT" tone="warning" value={pnt} />
      </section>

      {message ? <Alert tone="success">{message}</Alert> : null}

      <section className="glass-card rounded-[var(--radius-card)] p-4">
        <label className="block max-w-2xl">
          <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
            Tìm nhân sự trên sơ đồ
          </span>
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên, username, mã nhân viên, nhóm hoặc phân nhóm"
            type="search"
            value={query}
          />
        </label>
        <p aria-live="polite" className="mt-2 text-sm font-medium text-[var(--text-muted)]">
          Hiển thị {profiles.length}/{allProfiles.length} nhân sự
        </p>
      </section>

      <PersonnelOrgChart onEdit={setSelectedProfile} profiles={profiles} />

      {selectedProfile ? (
        <PersonnelEditorDialog
          canResetPassword={currentAccount.role === "admin"}
          key={selectedProfile.id}
          onClose={() => setSelectedProfile(null)}
          onSaved={async () => {
            await refreshRemoteData();
            setMessage(`Đã cập nhật cơ cấu cho ${selectedProfile.fullName}.`);
            setSelectedProfile(null);
          }}
          profile={selectedProfile}
        />
      ) : null}
    </AdminShell>
  );
};

const PersonnelMetric = ({
  icon,
  label,
  tone,
  value
}: {
  readonly icon: IconName;
  readonly label: string;
  readonly tone: "neutral" | "primary" | "info" | "warning";
  readonly value: number;
}): React.ReactElement => {
  const toneClass = {
    neutral: "text-[var(--foreground)]",
    primary: "text-[var(--primary-strong)]",
    info: "text-[var(--info-strong)]",
    warning: "text-[var(--warning-strong)]"
  } as const;

  return (
    <article className={`metric-card rounded-[var(--radius-card)] p-4 ${toneClass[tone]}`}>
      <div className="flex min-w-0 items-center gap-2 pr-6">
        <Icon name={icon} />
        <p className="break-words text-xs font-semibold uppercase leading-5 opacity-80">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
};

export default AdminPersonnelPage;
