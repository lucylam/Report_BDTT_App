"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, Button, Field, Icon, Input } from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";
import { loadRememberLoginPreference } from "@/lib/storage";

const LoginPage = (): React.ReactElement => {
  const router = useRouter();
  const { login } = useAppData();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberLogin, setRememberLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setRememberLogin(loadRememberLoginPreference());
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const submitLogin = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const account = login(username, password, rememberLogin);
      if (account.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace(account.role === "admin" ? "/admin" : "/worker");
      }
    } catch (loginError) {
      console.error("[LoginPage.submitLogin]", loginError);
      setError(
        loginError instanceof Error ? loginError.message : "Không đăng nhập được."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-5 md:py-8">
      <section className="app-shell grid w-full max-w-5xl overflow-hidden rounded-[22px] p-4 md:grid-cols-[0.92fr_1.08fr] md:p-5">
        <div className="hidden rounded-[var(--radius-card)] bg-[var(--foreground)] p-7 text-[var(--surface)] shadow-[var(--shadow-soft-md)] md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase opacity-75">Tiến độ BDTT 2026</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight">
              Không gian làm việc nội bộ
            </h1>
            <p className="mt-4 max-w-md text-sm font-semibold leading-7 opacity-85">
              Công nhân cập nhật tiến độ, nhóm trưởng giám sát WorkOrder, tổ trưởng kiểm tra
              tình trạng báo cáo trong cùng một giao diện.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LoginMetric icon="calendar" label="Mốc nhắc" value="12:00" />
            <LoginMetric icon="spreadsheet" label="Báo cáo" value="Excel" />
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft-sm)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <CompanyBrand
              className="min-w-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-4 ring-1 ring-[var(--border)]"
              variant="full"
            />
            <ThemeToggle className="shrink-0" />
          </div>

          <div className="mt-7">
            <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
              Đăng nhập nội bộ
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
              Vào hệ thống BDTT
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--text-muted)]">
              Dùng tài khoản được cấp để vào đúng màn hình theo vai trò.
            </p>
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={submitLogin}>
            <Field label="Tên đăng nhập">
              <Input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ví dụ: tên + chữ viết tắt nhóm"
                required
                value={username}
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                trailing={
                  <button
                    className="focus-ring min-h-12 rounded-r-[var(--radius-field)] border-l border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary-strong)]"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                }
                type={showPassword ? "text" : "password"}
                value={password}
              />
            </Field>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
              <input
                checked={rememberLogin}
                className="h-5 w-5 accent-[var(--primary-strong)]"
                onChange={(event) => setRememberLogin(event.target.checked)}
                type="checkbox"
              />
              <span>Ghi nhớ đăng nhập trên thiết bị này</span>
            </label>
            {error ? <Alert>{error}</Alert> : null}
            <Button disabled={isSubmitting} full type="submit">
              {isSubmitting ? (
                <>
                  <Icon className="animate-spin" name="loading" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <Icon name="account" />
                  Đăng nhập
                </>
              )}
            </Button>
          </form>
          <PwaInstallButton className="mt-4" compact showHint />
        </div>
      </section>
    </main>
  );
};

const LoginMetric = ({
  icon,
  label,
  value
}: {
  readonly icon: "calendar" | "spreadsheet";
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] bg-white/10 p-4 ring-1 ring-white/15">
    <Icon className="text-[var(--primary)]" name={icon} />
    <p className="mt-3 text-xs font-semibold uppercase opacity-75">{label}</p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
  </div>
);

export default LoginPage;
