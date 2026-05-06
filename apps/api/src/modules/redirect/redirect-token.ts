import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../../config/env";

const TOKEN_SEPARATOR = ".";

const toBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const fromBase64Url = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

export const createRedirectSessionToken = (sessionId: string): string => {
  const payload = toBase64Url(sessionId);
  const signature = createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}${TOKEN_SEPARATOR}${signature}`;
};

export const verifyRedirectSessionToken = (token: string): string | null => {
  const [payload, signature] = token.split(TOKEN_SEPARATOR);
  if (!payload || !signature) return null;

  const expectedSignature = createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
  const expectedBytes = Buffer.from(expectedSignature);
  const providedBytes = Buffer.from(signature);

  if (expectedBytes.length !== providedBytes.length) return null;
  if (!timingSafeEqual(expectedBytes, providedBytes)) return null;

  try {
    return fromBase64Url(payload);
  } catch {
    return null;
  }
};
