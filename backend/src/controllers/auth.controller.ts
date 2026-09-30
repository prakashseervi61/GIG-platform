import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { ApiError } from "../utils/ApiError";
import { loginSchema, registerSchema, refreshSchema } from "../schemas/auth.schema";
import type { RegisterInput, LoginInput } from "../schemas/auth.schema";
import { loginUser, registerUser, toPublicUser } from "../services/auth.service";
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken } from "../services/token.service";

const register = asyncHandler(async (req: Request, res: Response) => {
  const input = (req.validated?.body as RegisterInput) ?? req.body;
  const user = await registerUser(input);
  const tokens = await issueTokenPair({ sub: user.id, role: user.role, name: user.name });
  res.status(201).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toPublicUser(user)
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = (req.validated?.body as LoginInput) ?? req.body;
  const user = await loginUser(identifier, password);
  const tokens = await issueTokenPair({ sub: user.id, role: user.role, name: user.name });
  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: toPublicUser(user)
  });
});

const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.validated?.body as { refreshToken: string };
  const tokens = await rotateRefreshToken(refreshToken);
  res.status(200).json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.validated?.body as { refreshToken: string };
  await revokeRefreshToken(refreshToken);
  res.status(204).send();
});

const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized("TOKEN_MISSING", "Authentication required");
  }
  res.status(200).json({ user: req.user });
});

export const authController = {
  register,
  login,
  refresh,
  logout,
  me
};

export const authValidation = {
  register: validate(registerSchema),
  login: validate(loginSchema),
  refresh: validate(refreshSchema)
};