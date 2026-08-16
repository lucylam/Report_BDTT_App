"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Icon } from "@/components/ui";
import type { AppNotification } from "@/lib/notifications";
import {
  getNotificationHref,
  getPortalModule
} from "@/lib/portalModules";
import { cn } from "@/lib/ui";

interface NotificationsResponse {
  readonly ok?: boolean;
  readonly notifications?: AppNotification[];
  readonly error?: string;
}

export const GlobalNotifications = ({
  className
}: {
  readonly className?: string;
}): React.ReactElement => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | NotificationsResponse
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Không tải được thông báo.");
      }
      setNotifications(payload?.notifications ?? []);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không tải được thông báo.");
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => void refresh(), 0);
    const intervalId = window.setInterval(() => void refresh(), 45_000);
    const handleFocus = (): void => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(timerId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const unread = notifications.filter((notification) => !notification.readAt);

  const markAsRead = async (ids: readonly string[], markAll = false): Promise<void> => {
    if (ids.length === 0) return;
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        ids.includes(notification.id) ? { ...notification, readAt } : notification
      )
    );
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify(markAll ? { markAll: true } : { notificationIds: ids })
    }).catch(() => undefined);
  };

  const toggle = (): void => {
    setIsOpen((current) => !current);
  };

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        aria-expanded={isOpen}
        aria-label="Thông báo"
        className="focus-ring pressable relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] lg:h-10 lg:w-10"
        onClick={toggle}
        type="button"
      >
        <Icon name="bell" />
        {unread.length > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-[var(--on-danger)]">
            {Math.min(unread.length, 99)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 max-h-[70dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-floating)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Thông báo</p>
              <p className="mt-0.5 text-xs font-normal text-[var(--text-muted)]">
                Tất cả công tác
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unread.length > 0 ? (
                <button
                  className="focus-ring min-h-9 rounded-[var(--radius-field)] px-2 text-xs font-medium text-[var(--primary-strong)] hover:bg-[var(--primary-soft)]"
                  onClick={() => void markAsRead(unread.map((item) => item.id), true)}
                  type="button"
                >
                  Đọc tất cả
                </button>
              ) : null}
              <Badge tone="info">{notifications.length}</Badge>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-3 rounded-[var(--radius-field)] bg-[var(--warning-soft)] p-3 text-xs font-semibold leading-5 text-[var(--warning)]">
              {error}
            </p>
          ) : null}

          <div className="mt-3 space-y-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const moduleDefinition = getPortalModule(notification.module);
                return (
                  <Link
                    className={cn(
                      "focus-ring pressable block rounded-[var(--radius-field)] border border-[var(--line)] p-3",
                      notification.readAt
                        ? "bg-[var(--surface-muted)]"
                        : "border-l-[3px] border-l-[var(--info)] bg-[var(--info-soft)]"
                    )}
                    href={getNotificationHref(notification.module, notification.entityId, notification.href)}
                    key={notification.id}
                    onClick={() => {
                      if (!notification.readAt) void markAsRead([notification.id]);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {notification.title}
                      </p>
                      <Badge tone="neutral">
                        {moduleDefinition?.shortLabel ?? notification.module.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-5 text-[var(--text-muted)]">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs font-normal text-[var(--text-soft)]">
                      {new Date(notification.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </Link>
                );
              })
            ) : (
              <p className="py-5 text-center text-sm font-medium text-[var(--text-muted)]">
                Chưa có thông báo.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
