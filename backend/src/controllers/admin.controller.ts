import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { adminListWorkers, verifyCertification, verifyWorkerProfile } from "../services/worker.service";
import { getAnalytics, getDashboard } from "../services/analytics.service";
import type { ListWorkersQueryInput, VerifyCertificationInput, VerifyWorkerInput } from "../schemas/worker.schema";
import type { AuthUser } from "../types";

const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  res.status(200).json(await getDashboard(user));
});

const analytics = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  res.status(200).json(await getAnalytics(user));
});

const listWorkers = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const query = (req.validated?.query as ListWorkersQueryInput) ?? {};
  const workers = await adminListWorkers(user, query);
  res.status(200).json({ workers, count: workers.length });
});

const verifyWorker = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const { status, note } = req.validated?.body as VerifyWorkerInput;
  const updated = await verifyWorkerProfile(user, id, status, note);
  res.status(200).json({
    message: `Worker ${status}`,
    worker: {
      id: updated.id,
      verificationStatus: updated.verification_status,
      verifiedAt: updated.verified_at,
      verifiedBy: updated.verified_by
    }
  });
});

const verifyCert = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id, certificationId } = req.validated?.params as { id: string; certificationId: string };
  const { status } = req.validated?.body as VerifyCertificationInput;
  const updated = await verifyCertification(user, id, certificationId, status);
  res.status(200).json({
    message: `Certification ${status}`,
    certification: updated
  });
});

export const adminController = {
  listWorkers,
  verifyWorker,
  verifyCert,
  dashboard,
  analytics
};