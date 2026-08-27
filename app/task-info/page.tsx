"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { MobileAppHeader } from "@/components/MobileAppChrome";
import { ModeSwitch } from "@/components/ModeSwitch";
import { TaskInformationView } from "@/components/task-info/TaskInformationView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLoadingState, PageHeader } from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";

const TaskInfoPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout } = useAppData();

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!data || !currentAccount || currentAccount.mustChangePassword) {
    return <AppLoadingState title="Đang tải lịch BDTT 2026" />;
  }

  const showSupervision = currentAccount.role === "admin";

  return (
    <main className="mobile-native-page min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pb-2 pt-2 sm:px-3 sm:pt-3 lg:p-3 2xl:p-4">
      <div className="app-shell mobile-native-shell mx-auto min-h-[calc(100dvh-1rem)] w-full max-w-none overflow-hidden rounded-[var(--radius-panel)] lg:min-h-[calc(100dvh-1.5rem)] 2xl:min-h-[calc(100dvh-2rem)]">
        <MobileAppHeader
          account={currentAccount}
          accountStatusLabel="Thông tin"
          activeModule="bdtt"
          bdttHref="/task-info"
          contextAction={
            <ModeSwitch
              activeMode="taskInfo"
              className="w-auto max-w-[18rem] text-[11px]"
              showSupervision={showSupervision}
            />
          }
          onLogout={logout}
          showInstallButton
          title="Thông tin BDTT 2026"
        />

        <header className="hidden border-b border-[var(--line)] bg-[var(--surface)]/96 px-5 py-5 backdrop-blur-xl lg:block">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
            <PageHeader
              className="min-w-0 flex-1"
              description="Lịch dừng máy và chạy lại"
              eyebrow="Thông tin · BDTT 2026"
              title="Thông tin kế hoạch"
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <GlobalNotifications />
              <ThemeToggle />
              <ModeSwitch activeMode="taskInfo" showSupervision={showSupervision} />
              <AccountMenu
                account={currentAccount}
                onLogout={logout}
                showInstallButton
                statusLabel="Thông tin"
              />
            </div>
          </div>
        </header>

        <section className="min-w-0 bg-[var(--background)] p-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-3 lg:p-5">
          <TaskInformationView />
        </section>
      </div>
    </main>
  );
};

export default TaskInfoPage;
