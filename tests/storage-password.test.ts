import { describe, expect, it } from "vitest";
import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import { changeAccountPassword } from "@/lib/storage";
import type { AppData } from "@/types/domain";

const buildAppData = (): { readonly data: AppData; readonly accountId: string } => {
  const accounts = createSeedAccounts();
  const loginAccount = accounts.find((account) => account.canLogin);
  if (!loginAccount) throw new Error("Seed không có tài khoản đăng nhập được.");
  return {
    data: {
      accounts,
      profiles: createProfilesFromAccounts(accounts),
      tasks: [],
      progress: [],
      dailySnapshots: [],
      offlineQueue: [],
      activeUserId: loginAccount.id
    },
    accountId: loginAccount.id
  };
};

describe("changeAccountPassword", () => {
  it("từ chối mật khẩu dưới 6 ký tự", () => {
    const { data, accountId } = buildAppData();
    expect(() => changeAccountPassword(data, accountId, "12345")).toThrow(
      /ít nhất 6 ký tự/
    );
  });

  it("từ chối dùng lại mật khẩu mặc định", () => {
    const { data, accountId } = buildAppData();
    expect(() => changeAccountPassword(data, accountId, "123456")).toThrow(
      /mặc định/
    );
  });

  it("từ chối mật khẩu trùng mật khẩu hiện tại", () => {
    const { data, accountId } = buildAppData();
    const afterFirstChange = changeAccountPassword(data, accountId, "matkhaumoi");
    expect(() =>
      changeAccountPassword(afterFirstChange, accountId, "matkhaumoi")
    ).toThrow(/khác mật khẩu hiện tại/);
  });

  it("đổi mật khẩu hợp lệ và tắt cờ mustChangePassword", () => {
    const { data, accountId } = buildAppData();
    const next = changeAccountPassword(data, accountId, "matkhaumoi");
    const account = next.accounts.find((item) => item.id === accountId);
    expect(account?.password).toBe("matkhaumoi");
    expect(account?.mustChangePassword).toBe(false);
  });
});
