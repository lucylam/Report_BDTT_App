"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  Field,
  Icon,
  Select
} from "@/components/ui";
import {
  ORG_GROUP_NAMES,
  ORG_ROLE_VALUES,
  deriveOrgMetadata,
  getOrgRoleLabel,
  getOrgSubgroups
} from "@/lib/org2026";
import type { OrgRole, Profile } from "@/types/domain";

interface PersonnelEditorDialogProps {
  readonly profile: Profile;
  readonly onClose: () => void;
  readonly onSaved: () => Promise<void>;
}

const groupLevelRoles: readonly OrgRole[] = [
  "toTruong",
  "nhomTruong",
  "nhomPho",
  "supervisor"
];

const editableRoles = ORG_ROLE_VALUES;

const readError = async (response: Response): Promise<string> => {
  const payload = (await response.json().catch(() => null)) as
    | { readonly error?: string }
    | null;
  return payload?.error || "Không cập nhật được cơ cấu nhân sự.";
};

export const PersonnelEditorDialog = ({
  profile,
  onClose,
  onSaved
}: PersonnelEditorDialogProps): React.ReactElement => {
  const [orgGroup, setOrgGroup] = useState(profile.orgGroup);
  const [subgroup, setSubgroup] = useState(profile.subgroup);
  const [orgRole, setOrgRole] = useState<OrgRole>(profile.orgRole);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const subgroupOptions = useMemo(() => getOrgSubgroups(orgGroup), [orgGroup]);
  const preview = deriveOrgMetadata(
    profile.username,
    orgRole,
    orgGroup,
    subgroup
  );

  const changeGroup = (nextGroup: string): void => {
    const nextSubgroups = getOrgSubgroups(nextGroup);
    setOrgGroup(nextGroup);
    setSubgroup((current) => {
      if (groupLevelRoles.includes(orgRole)) return "";
      if (nextSubgroups.includes(current)) return current;
      return orgRole === "pnt" ? nextSubgroups[0] ?? "" : "";
    });
  };

  const changeRole = (nextRole: OrgRole): void => {
    setOrgRole(nextRole);
    if (groupLevelRoles.includes(nextRole)) {
      setSubgroup("");
    } else if (nextRole === "pnt" && !subgroup) {
      setSubgroup(subgroupOptions[0] ?? "");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/personnel", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          orgGroup,
          subgroup,
          orgRole
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      await onSaved();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Không cập nhật được cơ cấu nhân sự."
      );
    }
  };

  return (
    <Dialog
      className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-xl"
      description="Thay đổi này cập nhật phạm vi tổ chức và quyền quản lý BDTT của nhân sự."
      eyebrow="Quản trị nhân sự"
      onClose={status === "saving" ? () => undefined : onClose}
      title="Chỉnh vai trò và phân nhóm"
    >
      <form className="mt-5" onSubmit={(event) => void submit(event)}>
        <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-soft)] text-[var(--primary-strong)]">
              <Icon name="account" />
            </span>
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-[var(--foreground)]">
                {profile.fullName}
              </p>
              <p className="mt-1 break-words text-sm font-medium text-[var(--text-muted)]">
                {profile.username} · Mã NV {profile.employeeCode || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2" label="Nhóm công tác">
            <Select onChange={(event) => changeGroup(event.target.value)} value={orgGroup}>
              {ORG_GROUP_NAMES.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </Select>
          </Field>

          <Field label="Vai trò">
            <Select
              onChange={(event) => changeRole(event.target.value as OrgRole)}
              value={orgRole}
            >
              {editableRoles.map((role) => (
                <option key={role} value={role}>{getOrgRoleLabel(role)}</option>
              ))}
            </Select>
          </Field>

          <Field
            hint={groupLevelRoles.includes(orgRole) ? "Vai trò cấp nhóm không cần phân nhóm." : undefined}
            label="Phân nhóm"
          >
            <Select
              disabled={groupLevelRoles.includes(orgRole)}
              onChange={(event) => setSubgroup(event.target.value)}
              required={orgRole === "pnt"}
              value={subgroup}
            >
              {orgRole !== "pnt" ? <option value="">Không phân nhóm</option> : null}
              {subgroupOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">Phạm vi sau thay đổi</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{preview.orgTitle}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{preview.orgAssignment}</p>
        </div>

        <Alert className="mt-4" tone="warning">
          Task đang giao vẫn giữ nguyên người thực hiện. Chức năng này không tự chuyển hoặc xóa WorkOrder.
        </Alert>
        {message ? <Alert className="mt-3" tone="danger">{message}</Alert> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-4 md:flex-row md:justify-end">
          <Button disabled={status === "saving"} onClick={onClose} variant="secondary">
            Đóng
          </Button>
          <Button disabled={status === "saving"} type="submit">
            <Icon
              className={status === "saving" ? "motion-safe:animate-spin" : undefined}
              name={status === "saving" ? "loading" : "check"}
            />
            {status === "saving" ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
