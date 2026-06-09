"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { useAppData } from "@/hooks/useAppData";
import { BDTT_2026_TITLE } from "@/lib/org2026";
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
      <section className="soft-panel w-full max-w-md overflow-hidden p-5 md:p-7">
        <CompanyBrand className="rounded-[1.5rem] bg-white/76 p-4 ring-1 ring-[var(--border)]" variant="full" />
        <div className="mt-5 rounded-[1.75rem] bg-[var(--primary-strong)] px-5 py-6 text-white shadow-[var(--shadow-floating)]">
          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
            {BDTT_2026_TITLE}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            Đăng nhập
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/78">
            Worker và cấp quản lý dùng username nội bộ để vào đúng workspace.
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submitLogin}>
          <label className="block">
            <span className="text-sm font-semibold">Username</span>
            <input
              autoComplete="username"
              className="focus-ring control-pill mt-2 min-h-12 w-full rounded-full px-4 text-base"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="thanhcm"
              required
              value={username}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mật khẩu</span>
            <div className="control-pill mt-2 flex rounded-full">
              <input
                autoComplete="current-password"
                className="focus-ring min-h-12 min-w-0 flex-1 rounded-l-full border-0 bg-transparent px-4 text-base"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                className="focus-ring min-h-12 rounded-r-full border-l border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary-strong)]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-white/72 px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-[var(--border)]">
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
              className="rounded-2xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          ) : null}
          <button
            className="focus-ring pressable min-h-12 rounded-full bg-[var(--primary-strong)] px-4 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft-sm)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <PwaInstallButton className="mt-4" compact />
      </section>
    </main>
  );
};

export default LoginPage;
