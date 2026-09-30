import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  addCertificationToWorker,
  addSkillToWorker,
  getCertifications,
  getOwnWorkerId,
  getWorkerContext,
  removeSkillFromWorker,
  updateAvailability,
  updateMyProfile
} from "../services/worker.service";
import type { UpdateWorkerProfileInput, SetAvailabilityInput, AddSkillInput, AddCertificationInput } from "../schemas/worker.schema";
import type { AuthUser } from "../types";

const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const workerId = await getOwnWorkerId(user.sub);
  const context = await getWorkerContext(workerId);
  res.status(200).json(context);
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const context = await getWorkerContext(id);

  const isOwner = context.profile.userId === user.sub;
  const isAdmin = user.role === "federation_admin" || user.role === "coop_admin";
  if (!isOwner && !isAdmin) {
    context.certifications = context.certifications.filter(
      (cert) => cert.verificationStatus === "approved"
    );
  }
  res.status(200).json(context);
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const body = (req.validated?.body as UpdateWorkerProfileInput) ?? {};
  const updated = await updateMyProfile(user, id, body);
  res.status(200).json({
    message: "Worker profile updated",
    worker: { id: updated.id, cooperativeId: updated.cooperative_id, experienceYears: updated.experience_years, hourlyRate: Number(updated.hourly_rate), latitude: updated.latitude, longitude: updated.longitude, updatedAt: updated.updated_at }
  });
});

const availability = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const body = req.validated?.body as SetAvailabilityInput;
  const updated = await updateAvailability(user, id, body);
  res.status(200).json({
    message: updated.is_available ? "Worker is marked available" : "Worker is marked unavailable",
    worker: { id: updated.id, isAvailable: updated.is_available, latitude: updated.latitude, longitude: updated.longitude, updatedAt: updated.updated_at }
  });
});

const addSkill = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const body = req.validated?.body as AddSkillInput;
  const result = await addSkillToWorker(user, id, body);
  res.status(201).json({ message: "Skill added to worker", skill: result.skill, experienceLevel: result.experienceLevel });
});

const removeSkill = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id, skillId } = req.validated?.params as { id: string; skillId: string };
  await removeSkillFromWorker(user, id, skillId);
  res.status(200).json({ message: "Skill removed from worker" });
});

const addCertification = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const body = req.validated?.body as AddCertificationInput;
  const cert = await addCertificationToWorker(user, id, body);
  res.status(201).json({ message: "Certification submitted for verification", certification: cert });
});

const listCertifications = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  const { id } = req.validated?.params as { id: string };
  const certifications = await getCertifications(user, id);
  res.status(200).json({ certifications });
});

export const workerController = {
  getMe,
  getById,
  update,
  availability,
  addSkill,
  removeSkill,
  addCertification,
  listCertifications
};