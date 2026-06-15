import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_INITIAL_PASSWORD,
  createProfilesFromAccounts,
  createSeedAccounts
} from "@/lib/accounts";
import { loadAppData, loginAccount } from "@/lib/storage";
import type { AppData, AuthAccount } from "@/types/domain";

const STORAGE_KEY = "bdtt-progress-demo-v4";
const SESSION_USER_KEY = "bdtt-session-user-id";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const installBrowserStorage = (): {
  readonly localStorage: Storage;
  readonly sessionStorage: Storage;
} => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      sessionStorage
    }
  });
  return { localStorage, sessionStorage };
};

const buildAppData = (): {
  readonly data: AppData;
  readonly account: AuthAccount;
} => {
  const accounts = createSeedAccounts();
  const account = accounts.find((item) => item.canLogin);
  if (!account) throw new Error("Seed không có tài khoản đăng nhập được.");
  return {
    account,
    data: {
      accounts,
      profiles: createProfilesFromAccounts(accounts),
      tasks: [],
      progress: [],
      dailySnapshots: [],
      offlineQueue: [],
      activeUserId: null
    }
  };
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("login persistence", () => {
  it("khôi phục tài khoản đang đăng nhập khi bật ghi nhớ đăng nhập", () => {
    const { localStorage, sessionStorage } = installBrowserStorage();
    const { account, data } = buildAppData();

    loginAccount(data, account.username, DEFAULT_INITIAL_PASSWORD, true);

    const persisted = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    ) as Partial<AppData>;
    expect(persisted.activeUserId).toBe(account.id);
    expect(sessionStorage.getItem(SESSION_USER_KEY)).toBeNull();
    expect(loadAppData().activeUserId).toBe(account.id);
  });

  it("chỉ giữ phiên trong tab hiện tại khi tắt ghi nhớ đăng nhập", () => {
    const { localStorage, sessionStorage } = installBrowserStorage();
    const { account, data } = buildAppData();

    loginAccount(data, account.username, DEFAULT_INITIAL_PASSWORD, false);

    const persisted = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    ) as Partial<AppData>;
    expect(persisted.activeUserId).toBeNull();
    expect(sessionStorage.getItem(SESSION_USER_KEY)).toBe(account.id);
    expect(loadAppData().activeUserId).toBe(account.id);

    sessionStorage.clear();
    expect(loadAppData().activeUserId).toBeNull();
  });
});
