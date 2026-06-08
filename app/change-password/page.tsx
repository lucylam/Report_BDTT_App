"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppData } from "@/hooks/useAppData";

const ChangePasswordPage = (): React.ReactElement => {
  const router = useRouter();
  const { changePassword, currentAccount, data } = useAppData();
  const [nextPassword, setNextPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const submitChange = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError("");
    if (nextPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsSubmitting(true);
    try {
      changePassword(nextPassword);
      router.replace(currentAccount?.role === "admin" ? "/admin" : "/worker");
    } catch (changeError) {
      console.error("[ChangePasswordPage.submitChange]", changeError);
      setError(
        changeError instanceof Error ? changeError.message : "Không đổi được mật khẩu."
      );
      setIsSubmitting(false);
    }
  };

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-600">Đang kiểm tra đăng nhập...</p>
      </main>
    );
  }

  if (!currentAccount) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <a
          className="focus-ring pressable rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
          href="/login"
        >
          Đăng nhập
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="soft-panel w-full max-w-md rounded-[2rem] p-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
          First login
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">Bắt buộc đổi mật khẩu</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Tài khoản {currentAccount.username} đang dùng mật khẩu mặc định. Hãy đặt
          mật khẩu mới trước khi vào app.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submitChange}>
          <PasswordField
            label="Mật khẩu mới"
            onChange={setNextPassword}
            showPassword={showPassword}
            value={nextPassword}
          />
          <PasswordField
            label="Nhập lại mật khẩu mới"
            onChange={setConfirmPassword}
            showPassword={showPassword}
            value={confirmPassword}
          />
          <button
            className="focus-ring pressable min-h-11 rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-sm"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </button>
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
            {isSubmitting ? "Đang lưu..." : "Lưu mật khẩu mới"}
          </button>
        </form>
      </section>
    </main>
  );
};

const PasswordField = ({
  label,
  onChange,
  showPassword,
  value
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly showPassword: boolean;
  readonly value: string;
}): React.ReactElement => {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        autoComplete="new-password"
        className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-[var(--border)] bg-white/90 px-4 text-base shadow-sm"
        minLength={6}
        onChange={(event) => onChange(event.target.value)}
        required
        type={showPassword ? "text" : "password"}
        value={value}
      />
    </label>
  );
};

export default ChangePasswordPage;
