import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt:v1";
const KEY_LENGTH = 64;

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("base64url");
  return `${HASH_PREFIX}:${salt}:${hash}`;
};

export const verifyPassword = (
  password: string,
  storedHash: string | null | undefined
): boolean => {
  if (!storedHash) return false;

  const [algorithm, version, salt, expectedHash] = storedHash.split(":");
  if (algorithm !== "scrypt" || version !== "v1" || !salt || !expectedHash) {
    return false;
  }

  try {
    const expected = Buffer.from(expectedHash, "base64url");
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};
