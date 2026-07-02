import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies a valid password hash", () => {
    const hash = hashPassword("matkhaumoi");

    expect(hash).toMatch(/^scrypt:v1:/);
    expect(verifyPassword("matkhaumoi", hash)).toBe(true);
    expect(verifyPassword("matkhausai", hash)).toBe(false);
  });

  it("rejects missing or malformed hashes", () => {
    expect(verifyPassword("matkhaumoi", null)).toBe(false);
    expect(verifyPassword("matkhaumoi", "123456")).toBe(false);
  });
});
