import { randomBytes } from "node:crypto";

// 16 random bytes = 128 bits of entropy, encoded as 22 URL-safe characters.
// Far beyond guessable: an attacker cannot enumerate tokens, and a token
// reveals nothing about the order, product, artisan or database IDs.
const TOKEN_BYTES = 16;

/** Cryptographically secure, URL-safe, non-sequential public token. */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

// Accepts a range rather than exactly 22 so the length can grow later without
// breaking QR codes that are already printed. Used to reject junk input
// before it ever reaches the database.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{16,64}$/;

export function isValidTokenFormat(value: unknown): value is string {
  return typeof value === "string" && TOKEN_FORMAT.test(value);
}

/** Safe-to-log fragment of a token (never log full tokens for invalid scans). */
export function tokenPrefix(value: string): string {
  return value.slice(0, 6);
}
