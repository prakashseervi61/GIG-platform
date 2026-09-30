import { randomUUID } from "node:crypto";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { redisClient } from "../db/redis";
import { config } from "../config";
import type { TokenPayload } from "../utils/jwt";

const REFRESH_KEY_PREFIX = "refresh:";

function refreshKey(jti: string): string {
  return `${REFRESH_KEY_PREFIX}${jti}`;
}

export async function refreshTokenTtlSeconds(): Promise<number> {
  const defaultSeconds = 7 * 24 * 60 * 60;
  const match = config.jwt.refreshExpiresIn.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return defaultSeconds;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}

export async function issueTokenPair(user: TokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken(user);
  const jti = randomUUID();
  const refreshToken = signRefreshToken(user, jti);
  const ttl = await refreshTokenTtlSeconds();
  await redisClient.set(refreshKey(jti), user.sub, { EX: ttl });
  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const storedSubject = await redisClient.get(refreshKey(payload.jti));
  if (storedSubject === null || storedSubject !== payload.sub) {
    throw ApiError.unauthorized("REFRESH_TOKEN_REVOKED", "Refresh token has been revoked");
  }

  await redisClient.del(refreshKey(payload.jti));
  return issueTokenPair({ sub: payload.sub, role: payload.role, name: payload.name });
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await redisClient.del(refreshKey(payload.jti));
  } catch {
    // Already invalid or expired - nothing to revoke.
  }
}