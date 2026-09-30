import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authController, authValidation } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", authValidation.register, authController.register);
authRouter.post("/login", authValidation.login, authController.login);
authRouter.post("/refresh", authValidation.refresh, authController.refresh);
authRouter.post("/logout", authValidation.refresh, authController.logout);
authRouter.get("/me", authenticate, authController.me);