"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { DEFAULT_INITIAL_PASSWORD } from "@/lib/accounts";
import { useAppData } from "@/hooks/useAppData";

const LoginPage = (): React.ReactElement => {
  const router = useRouter();
  const { login } = useAppData();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const submitLogin = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const account = login(username, password);
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
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="soft-panel w-full max-w-md rounded-[2rem] p-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
          BDTT Internal
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">Đăng nhập tài khoản nội bộ</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Dùng username là phần trước ký tự @ trong email PVCFC. Mật khẩu mặc định
          lần đầu là {DEFAULT_INITIAL_PASSWORD}.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submitLogin}>
          <label className="block">
            <span className="text-sm font-semibold">Username</span>
            <input
              autoComplete="username"
              className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-[var(--border)] bg-white/90 px-4 text-base shadow-sm"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="thanhcm"
              required
              value={username}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mật khẩu</span>
            <div className="mt-2 flex rounded-2xl border border-[var(--border)] bg-white/90 shadow-sm">
              <input
                autoComplete="current-password"
                className="focus-ring min-h-12 min-w-0 flex-1 rounded-l-2xl border-0 bg-transparent px-4 text-base"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                className="focus-ring min-h-12 rounded-r-2xl border-l border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
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
            className="focus-ring pressable min-h-12 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <PwaInstallButton className="mt-5" showHint variant="panel" />
      </section>
    </main>
  );
};

export default LoginPage;
