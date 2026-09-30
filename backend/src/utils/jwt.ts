import jwt from "jsonwebtoken";
import { config } from "../config";
import type { UserRole } from "../types";

export interface TokenPayload {
  sub: string;
  role: UserRole;
  name: string;
}

export function signAccessToken(user: TokenPayload): string {
  return jwt.sign({ sub: user.sub, role: user.role, name: user.name }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function signRefreshToken(user: TokenPayload, jti: string): string {
  return jwt.sign({ sub: user.sub, role: user.role, name: user.name, jti }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwt.accessSecret);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Invalid access token payload");
  }
  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
    name: decoded.name as string
  };
}

export function verifyRefreshToken(token: string): TokenPayload & { jti: string } {
  const decoded = jwt.verify(token, config.jwt.refreshSecret);
  if (typeof decoded === "string" || !decoded.sub || !decoded.jti) {
    throw new Error("Invalid refresh token payload");
  }
  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
    name: decoded.name as string,
    jti: decoded.jti as string
  };
}