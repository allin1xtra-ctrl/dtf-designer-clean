/**
 * In-memory verification code store for owner signup.
 *
 * Security properties:
 * - 9-digit numeric codes (100,000,000 – 999,999,999)
 * - 10-minute expiry
 * - One-time-use (code is deleted on first successful verify)
 * - Rate limit: max 3 send attempts per email per 15-minute window
 */

import crypto from "crypto";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX_SENDS = 3;

interface PendingCode {
  code: string;
  expiresAt: number;
  used: boolean;
}

interface RateEntry {
  count: number;
  windowStart: number;
}

// Global maps — these live in the Node.js process memory.
// On serverless they reset per cold-start; that is acceptable for Preview use.
const pendingCodes = new Map<string, PendingCode>();
const rateLimits = new Map<string, RateEntry>();

/** Generate a cryptographically random 9-digit numeric code. */
function generateCode(): string {
  // Range: 100000000 – 999999999 (exactly 9 digits)
  const min = 100_000_000;
  const max = 999_999_999;
  const range = max - min + 1;
  const bytes = crypto.randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return String(min + (value % range));
}

/** Normalise an email address for use as a map key. */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Check & record a send attempt.
 * Returns true if the email is within the allowed rate window, false if blocked.
 */
export function checkRateLimit(email: string): boolean {
  const key = normaliseEmail(email);
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    rateLimits.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_MAX_SENDS) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Create and store a new verification code for the given email.
 * Any previously stored code for that email is replaced.
 */
export function createCode(email: string): string {
  const key = normaliseEmail(email);
  const code = generateCode();
  pendingCodes.set(key, { code, expiresAt: Date.now() + CODE_TTL_MS, used: false });
  return code;
}

/**
 * Verify a code for the given email.
 * Returns true only once — the code is immediately invalidated on success.
 */
export function verifyCode(email: string, suppliedCode: string): boolean {
  const key = normaliseEmail(email);
  const entry = pendingCodes.get(key);
  if (!entry) return false;
  if (entry.used) return false;
  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(key);
    return false;
  }

  const supplied = String(suppliedCode || "").trim();
  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(entry.code);
  const actual = Buffer.from(supplied);
  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return false;
  }

  // Invalidate immediately (one-time-use)
  pendingCodes.delete(key);
  return true;
}
