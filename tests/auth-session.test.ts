import { afterEach, describe, expect, it } from "vitest";
import {
  createAuthSessionToken,
  verifyAuthSessionToken
} from "@/lib/authSession";

afterEach(() => {
  Reflect.deleteProperty(process.env, "BDTT_AUTH_SESSION_SECRET");
});

describe("auth session tokens", () => {
  it("verifies a signed internal login session", async () => {
    process.env.BDTT_AUTH_SESSION_SECRET = "test-secret";

    const token = await createAuthSessionToken({
      profileId: "profile-1",
      username: "thanhcm"
    });
    const session = await verifyAuthSessionToken(token);

    expect(session?.profileId).toBe("profile-1");
    expect(session?.username).toBe("thanhcm");
  });

  it("rejects a tampered token", async () => {
    process.env.BDTT_AUTH_SESSION_SECRET = "test-secret";

    const token = await createAuthSessionToken({
      profileId: "profile-1",
      username: "thanhcm"
    });

    expect(await verifyAuthSessionToken(`${token}x`)).toBeNull();
  });
});
