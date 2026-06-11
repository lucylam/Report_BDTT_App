"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { PwaInstallButton } from "@/components/PwaInstallButton";
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
      <section className="app-shell grid w-full max-w-5xl overflow-hidden rounded-[2.2rem] p-4 md:grid-cols-[0.95fr_1.05fr] md:p-5">
        <div className="hidden rounded-[1.8rem] bg-[var(--primary-strong)] p-7 text-white shadow-[var(--shadow-floating)] md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-white/70">
              Tiến độ BDTT 2026
            </p>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-normal">
              Theo dõi tiến độ BDTT
            </h1>
            <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-white/76">
              Workspace nội bộ cho worker cập nhật tiến độ và cấp quản lý theo dõi toàn tổ.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LoginMetric label="Mốc nhắc" value="12:00" />
            <LoginMetric label="Nguồn DATA" value="Excel" />
          </div>
        </div>

        <div className="rounded-[1.8rem] bg-white/86 p-5 shadow-[var(--shadow-soft-sm)] backdrop-blur-xl md:p-7">
          <CompanyBrand className="rounded-[1.35rem] bg-white/78 p-4 ring-1 ring-[var(--border)]" variant="full" />
          <div className="mt-6">
            <p className="text-xs font-extrabold uppercase text-[var(--primary-strong)]">
              Internal access
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-normal md:text-4xl">
              Đăng nhập
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--text-muted)]">
              Dùng username PVCFC để vào đúng workspace theo quyền tài khoản.
            </p>
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={submitLogin}>
            <label className="block">
              <span className="text-sm font-extrabold">Username</span>
              <input
                autoComplete="username"
                className="focus-ring control-pill mt-2 min-h-12 w-full rounded-full px-4 text-base font-semibold"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="thanhcm"
                required
                value={username}
              />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold">Mật khẩu</span>
              <div className="control-pill mt-2 flex rounded-full">
                <input
                  autoComplete="current-password"
                  className="focus-ring min-h-12 min-w-0 flex-1 rounded-l-full border-0 bg-transparent px-4 text-base font-semibold"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="focus-ring min-h-12 rounded-r-full border-l border-[var(--border)] px-4 text-sm font-extrabold text-[var(--primary-strong)]"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[1.25rem] bg-white/78 px-4 py-3 text-sm font-bold text-slate-800 ring-1 ring-[var(--border)]">
              <input
                checked={rememberLogin}
                className="h-5 w-5 accent-[var(--primary-strong)]"
                onChange={(event) => setRememberLogin(event.target.checked)}
                type="checkbox"
              />
              <span>Ghi nhớ đăng nhập trên thiết bị này</span>
            </label>
            {error ? (
              <p
                aria-live="polite"
                className="rounded-[1.25rem] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}
            <button
              className="focus-ring pressable min-h-12 rounded-full bg-[var(--primary-strong)] px-4 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-soft-sm)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          <PwaInstallButton className="mt-4" compact showHint />
        </div>
      </section>
    </main>
  );
};

const LoginMetric = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-[1.25rem] bg-white/12 p-4 ring-1 ring-white/16">
      <p className="text-xs font-extrabold uppercase text-white/64">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
};

export default LoginPage;
