import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import {
  getAuthenticatedDataAdmin,
  getLocalAccountIdForUsername,
  isSessionProfileReference
} from "@/lib/api/session";
import {
  AUTH_SESSION_COOKIE,
  createAuthSessionToken
} from "@/lib/authSession";

const profile = {
  id: "9b65c6b8-69e0-411f-9a51-eaf9e603fcf9",
  username: "worker01"
};

const createRequestForUser = async (username: string): Promise<Request> => {
  const token = await createAuthSessionToken({
    profileId: profile.id,
    username
  });
  return new Request("https://bdtt.local/api/tasks/import", {
    headers: {
      cookie: `${AUTH_SESSION_COOKIE}=${encodeURIComponent(token)}`
    }
  });
};

const createSupabaseProfileClient = (username: string): SupabaseClient =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: profile.id,
              username,
              role: username === "vinhlpp" ? "admin" : "worker",
              is_active: true
            },
            error: null
          })
        })
      })
    })
  }) as unknown as SupabaseClient;

afterEach(() => {
  Reflect.deleteProperty(process.env, "BDTT_AUTH_SESSION_SECRET");
});

describe("api session helpers", () => {
  it("maps internal usernames to local account ids", () => {
    expect(getLocalAccountIdForUsername(" Worker01 ")).toBe("user-worker01");
  });

  it("accepts the DB profile id and local account id for the same session", () => {
    expect(isSessionProfileReference(profile.id, profile)).toBe(true);
    expect(isSessionProfileReference("user-worker01", profile)).toBe(true);
  });

  it("rejects another user reference", () => {
    expect(isSessionProfileReference("user-worker02", profile)).toBe(false);
  });

  it("allows only DATA admin for protected data write routes", async () => {
    process.env.BDTT_AUTH_SESSION_SECRET = "test-secret";

    const dataAdmin = await getAuthenticatedDataAdmin(
      await createRequestForUser("vinhlpp"),
      createSupabaseProfileClient("vinhlpp")
    );
    const worker = await getAuthenticatedDataAdmin(
      await createRequestForUser("worker01"),
      createSupabaseProfileClient("worker01")
    );

    expect(dataAdmin.ok).toBe(true);
    expect(worker).toMatchObject({ ok: false, status: 403 });
  });
});
