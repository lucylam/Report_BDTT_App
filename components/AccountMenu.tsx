"use client";

import Link from "next/link";
import { useState } from "react";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { Button, Dialog, Icon } from "@/components/ui";
import type { AuthAccount } from "@/types/domain";

interface AccountMenuProps {
  readonly account: AuthAccount;
  readonly onLogout: () => void;
  readonly statusLabel?: string;
  readonly statusTone?: "success" | "warning";
  readonly showInstallButton?: boolean;
}

export const AccountMenu = ({
  account,
  onLogout,
  statusLabel,
  statusTone = "success",
  showInstallButton = false
}: AccountMenuProps): React.ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Tài khoản"
        className="focus-ring pressable flex min-h-11 max-w-[15rem] shrink-0 items-center gap-2 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-left shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-muted)] sm:px-3"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
          {getInitials(account.fullName)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
            {account.fullName}
          </span>
          <span className="block truncate text-xs font-semibold text-[var(--text-muted)]">
            {account.orgTitle}
          </span>
        </span>
        <Icon className="hidden text-[var(--text-muted)] sm:block" name="chevronDown" />
      </button>

      {isOpen ? (
        <Dialog
          className="sm:max-w-md"
          description="Thông tin phiên làm việc, bảo mật và thao tác tài khoản."
          eyebrow="Tài khoản"
          onClose={() => setIsOpen(false)}
          title={account.fullName}
        >
          <div className="mt-5 space-y-4">
            <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">@{account.username}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{account.email}</p>
              <div className="mt-3 rounded-[var(--radius-field)] bg-[var(--primary-pale)] p-3 ring-1 ring-[var(--border)]">
                <p className="text-sm font-semibold text-[var(--primary-strong)]">
                  {account.orgTitle}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  {account.orgAssignment}
                </p>
              </div>
              {statusLabel ? (
                <p
                  className={`mt-3 inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${
                    statusTone === "success"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  {statusLabel}
                </p>
              ) : null}
            </div>

            {showInstallButton ? (
              <PwaInstallButton compact showHint variant="panel" />
            ) : null}

            <div className="grid gap-2">
              <Link
                className="focus-ring pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-5 text-sm font-semibold text-[var(--primary-contrast)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--success-strong)]"
                href="/change-password"
              >
                <Icon name="shield" />
                Đổi mật khẩu
              </Link>
              <Button full onClick={onLogout} variant="secondary">
                <Icon name="logout" />
                Đăng xuất
              </Button>
              <Button full onClick={() => setIsOpen(false)} variant="ghost">
                Đóng
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
};

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "B";
  const last = words[words.length - 1]?.[0] ?? "D";
  return `${first}${last}`.toUpperCase();
};
