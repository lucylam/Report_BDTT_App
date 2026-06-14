"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, Button, Field, Icon, Input } from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";

const ChangePasswordPage = (): React.ReactElement => {
  const router = useRouter();
  const { changePassword, currentAccount, data, logout } = useAppData();
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
        <p className="text-sm font-semibold text-[var(--text-muted)]">
          Đang kiểm tra đăng nhập...
        </p>
      </main>
    );
  }

  if (!currentAccount) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <Link
          className="focus-ring pressable inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-field)] bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--surface)]"
          href="/login"
        >
          <Icon name="account" />
          Đăng nhập
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="app-shell w-full max-w-lg overflow-hidden rounded-[22px] p-4">
        <div className="rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft-sm)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <CompanyBrand
              className="min-w-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-4 ring-1 ring-[var(--border)]"
              variant="full"
            />
            <ThemeToggle className="shrink-0" />
          </div>

          <div className="mt-6 rounded-[var(--radius-card)] bg-[var(--foreground)] px-5 py-6 text-[var(--surface)] shadow-[var(--shadow-soft-md)]">
            <p className="text-xs font-semibold uppercase opacity-75">Đăng nhập lần đầu</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">Đổi mật khẩu</h1>
            <p className="mt-3 text-sm font-semibold leading-6 opacity-85">
              Tài khoản {currentAccount.username} cần đặt mật khẩu mới trước khi tiếp tục.
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 opacity-75">
              Yêu cầu: tối thiểu 6 ký tự, khác mật khẩu mặc định và khác mật khẩu hiện tại.
            </p>
          </div>

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
            <Button
              className="text-[var(--primary-strong)]"
              onClick={() => setShowPassword((current) => !current)}
              variant="secondary"
            >
              {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            </Button>
            {error ? <Alert>{error}</Alert> : null}
            <Button disabled={isSubmitting} full type="submit">
              {isSubmitting ? (
                <>
                  <Icon className="animate-spin" name="loading" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Icon name="check" />
                  Lưu mật khẩu mới
                </>
              )}
            </Button>
            <Button
              className="underline-offset-4 hover:underline"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              variant="ghost"
            >
              Đăng xuất, quay lại màn hình đăng nhập
            </Button>
          </form>
        </div>
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
}): React.ReactElement => (
  <Field label={label}>
    <Input
      autoComplete="new-password"
      minLength={6}
      onChange={(event) => onChange(event.target.value)}
      required
      type={showPassword ? "text" : "password"}
      value={value}
    />
  </Field>
);

export default ChangePasswordPage;
