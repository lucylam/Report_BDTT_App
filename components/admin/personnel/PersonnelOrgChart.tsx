"use client";

import { Badge, Icon, Widget, WidgetHeader } from "@/components/ui";
import {
  ORG_GROUP_NAMES,
  ORG_GROUPS,
  getOrgRoleLabel
} from "@/lib/org2026";
import type { OrgRole, Profile } from "@/types/domain";

interface PersonnelOrgChartProps {
  readonly profiles: readonly Profile[];
  readonly onEdit: (profile: Profile) => void;
}

const roleOrder: Record<OrgRole, number> = {
  toTruong: 0,
  supervisor: 1,
  nhomTruong: 2,
  nhomPho: 3,
  pnt: 4,
  member: 5,
  placeholder: 6
};

const roleDotClass = (role: OrgRole): string => {
  if (role === "toTruong" || role === "supervisor") return "bg-[var(--primary-strong)]";
  if (role === "nhomTruong" || role === "nhomPho") return "bg-[var(--info-strong)]";
  if (role === "pnt") return "bg-[var(--warning-strong)]";
  if (role === "member") return "bg-[var(--success-strong)]";
  return "bg-[var(--text-soft)]";
};

const roleTextClass = (role: OrgRole): string => {
  if (role === "toTruong" || role === "supervisor") return "text-[var(--primary-strong)]";
  if (role === "nhomTruong" || role === "nhomPho") return "text-[var(--info-strong)]";
  if (role === "pnt") return "text-[var(--warning-strong)]";
  if (role === "member") return "text-[var(--success-strong)]";
  return "text-[var(--text-muted)]";
};

const sortProfiles = (profiles: readonly Profile[]): Profile[] =>
  [...profiles].sort((left, right) => {
    const roleDiff = roleOrder[left.orgRole] - roleOrder[right.orgRole];
    if (roleDiff !== 0) return roleDiff;
    return left.fullName.localeCompare(right.fullName, "vi");
  });

export const PersonnelOrgChart = ({
  profiles,
  onEdit
}: PersonnelOrgChartProps): React.ReactElement => {
  const leadership = sortProfiles(
    profiles.filter(
      (profile) => profile.orgRole === "toTruong" || profile.orgRole === "supervisor"
    )
  );
  const directPersonnel = sortProfiles(
    profiles.filter(
      (profile) =>
        profile.orgGroup === ORG_GROUPS.to &&
        profile.orgRole !== "toTruong" &&
        profile.orgRole !== "supervisor"
    )
  );
  const groups = ORG_GROUP_NAMES.filter((group) => group !== ORG_GROUPS.to)
    .map((group) => ({
      group,
      profiles: sortProfiles(
        profiles.filter(
          (profile) =>
            profile.orgGroup === group &&
            profile.orgRole !== "toTruong" &&
            profile.orgRole !== "supervisor"
        )
      )
    }))
    .filter(({ profiles: groupProfiles }) => groupProfiles.length > 0);
  const useWideTree = groups.length === ORG_GROUP_NAMES.length - 1;

  return (
    <Widget className="p-3 sm:p-4">
      <WidgetHeader
        className="mb-2"
        icon="people"
        subtitle="Chọn một node để chỉnh nhóm, phân nhóm hoặc vai trò."
        title="Sơ đồ tổ chức BDTT"
      />

      <div className="mt-2">
        {leadership.length > 0 || directPersonnel.length > 0 ? (
          <section aria-label="Điều hành tổ" className="mx-auto max-w-2xl">
            <div className="mx-auto flex min-h-10 w-fit items-center gap-2 rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2 text-xs font-semibold uppercase text-[var(--primary-strong)] shadow-[var(--shadow-soft-sm)]">
              <Icon className="h-4 w-4" name="shield" /> Điều hành tổ
            </div>
            {leadership.length > 0 ? (
              <div className="relative mx-auto grid w-full max-w-sm gap-2 pt-4">
                {leadership.map((profile) => (
                  <div
                    className="relative mx-auto w-full before:absolute before:-top-2 before:left-1/2 before:h-2 before:border-l-2 before:border-[var(--border-strong)]"
                    key={profile.id}
                  >
                    <PersonNode
                      onEdit={onEdit}
                      profile={profile}
                      prominent={profile.orgRole === "toTruong"}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {directPersonnel.length > 0 ? (
              <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                {directPersonnel.map((profile) => (
                  <PersonNode key={profile.id} onEdit={onEdit} profile={profile} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {leadership.length > 0 && groups.length > 0 ? (
          <div
            aria-hidden="true"
            className="mx-auto h-4 w-0 border-l-2 border-[var(--border-strong)]"
          />
        ) : null}

        <section
          aria-label="Các nhóm công tác"
          className={`relative grid items-start gap-2.5 pl-5 before:absolute before:bottom-6 before:left-2 before:top-6 before:border-l-2 before:border-[var(--border-strong)] ${
            useWideTree
              ? "xl:grid-cols-5 xl:gap-2 xl:pl-0 xl:pt-4 xl:before:bottom-auto xl:before:left-[10%] xl:before:right-[10%] xl:before:top-2 xl:before:border-l-0 xl:before:border-t-2"
              : ""
          }`}
        >
          {groups.map(({ group, profiles: groupProfiles }) => (
            <div
              className={`relative before:absolute before:-left-3 before:top-6 before:w-3 before:border-t-2 before:border-[var(--border-strong)] ${
                useWideTree
                  ? "xl:before:-top-2 xl:before:left-1/2 xl:before:h-2 xl:before:w-0 xl:before:border-l-2 xl:before:border-t-0"
                  : ""
              }`}
              key={group}
            >
              <GroupBranch
                group={group}
                onEdit={onEdit}
                profiles={groupProfiles}
              />
            </div>
          ))}
        </section>

        {leadership.length === 0 && directPersonnel.length === 0 && groups.length === 0 ? (
          <p className="rounded-[var(--radius-field)] border border-dashed border-[var(--border-strong)] p-5 text-center text-sm font-medium text-[var(--text-muted)]">
            Không tìm thấy nhân sự phù hợp.
          </p>
        ) : null}
      </div>
    </Widget>
  );
};

const GroupBranch = ({
  group,
  profiles,
  onEdit
}: {
  readonly group: string;
  readonly profiles: readonly Profile[];
  readonly onEdit: (profile: Profile) => void;
}): React.ReactElement => {
  const leaders = profiles.filter(
    (profile) => profile.orgRole === "nhomTruong" || profile.orgRole === "nhomPho"
  );
  const remaining = profiles.filter(
    (profile) => profile.orgRole !== "nhomTruong" && profile.orgRole !== "nhomPho"
  );
  const subgroupNames = Array.from(
    new Set(remaining.map((profile) => profile.subgroup || "Chưa phân nhóm"))
  ).sort((left, right) => left.localeCompare(right, "vi", { numeric: true }));

  return (
    <article className="min-w-0 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-2.5 shadow-[var(--shadow-soft-sm)]">
      <header className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-[var(--radius-field)] border border-[var(--info)] bg-[var(--info-soft)] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[var(--info-strong)]">
            <Icon name="people" />
          </span>
          <h3 className="break-words text-sm font-semibold text-[var(--foreground)]">{group}</h3>
        </div>
        <Badge tone="info">{profiles.length}</Badge>
      </header>

      {leaders.length > 0 ? (
        <>
          <div aria-hidden="true" className="mx-auto h-2 w-0 border-l-2 border-[var(--border-strong)]" />
          <div className="grid gap-1.5">
            {leaders.map((profile) => (
              <PersonNode key={profile.id} onEdit={onEdit} profile={profile} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 rounded-[var(--radius-field)] border border-dashed border-[var(--border-strong)] px-2.5 py-2 text-xs font-medium text-[var(--text-muted)]">
          Chưa chỉ định trưởng/phó nhóm.
        </p>
      )}

      <div className="relative mt-2 grid gap-1.5 pl-3 before:absolute before:bottom-4 before:left-1 before:top-4 before:border-l-2 before:border-[var(--border-strong)]">
        {subgroupNames.map((subgroup) => {
          const subgroupProfiles = remaining.filter(
            (profile) => (profile.subgroup || "Chưa phân nhóm") === subgroup
          );
          return (
            <section
              className="relative rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-2 before:absolute before:-left-2 before:top-4 before:w-2 before:border-t-2 before:border-[var(--border-strong)]"
              key={subgroup}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase text-[var(--text-muted)]">{subgroup}</h4>
                <span className="text-xs font-semibold tabular-nums text-[var(--text-soft)]">{subgroupProfiles.length}</span>
              </div>
              <div className="grid gap-1">
                {subgroupProfiles.map((profile) => (
                  <PersonNode key={profile.id} onEdit={onEdit} profile={profile} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
};

const PersonNode = ({
  profile,
  onEdit,
  prominent = false
}: {
  readonly profile: Profile;
  readonly onEdit: (profile: Profile) => void;
  readonly prominent?: boolean;
}): React.ReactElement => (
  <button
    aria-label={`Chỉnh vai trò của ${profile.fullName}`}
    className={`focus-ring pressable flex min-h-12 w-full min-w-0 items-center gap-2 rounded-[var(--radius-field)] border bg-[var(--surface)] px-2.5 py-2 text-left shadow-[var(--shadow-soft-sm)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] ${
      prominent
        ? "border-2 border-[var(--primary-strong)] bg-[var(--primary-pale)] px-3 py-2.5 shadow-[var(--shadow-floating)] ring-4 ring-[var(--primary-soft)]"
        : "border-[var(--line)]"
    }`}
    onClick={() => onEdit(profile)}
    type="button"
  >
    <span
      aria-hidden="true"
      className={`h-2 w-2 shrink-0 rounded-full ${roleDotClass(profile.orgRole)}`}
    />
    <span className="min-w-0 flex-1">
      <span className={`block break-words font-semibold leading-5 text-[var(--foreground)] ${prominent ? "text-base" : "text-sm"}`}>
        {profile.fullName}
      </span>
      <span className={`block break-words text-xs font-semibold leading-4 ${roleTextClass(profile.orgRole)}`}>
        {getOrgRoleLabel(profile.orgRole)} · {profile.username}
      </span>
    </span>
    <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-soft)]" name="settings" />
  </button>
);
