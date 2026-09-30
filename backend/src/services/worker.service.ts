import { ApiError } from "../utils/ApiError";
import {
  addCertification,
  addWorkerSkill,
  changeWorkerVerification,
  cooperativeExists,
  getCertification,
  getCooperativesManagedByAdmin,
  getSkillById,
  getWorkerById,
  getWorkerByUserId,
  getWorkerProfile,
  getWorkerSkills,
  listCertifications,
  listSkillsCatalog,
  listWorkersAdmin,
  removeWorkerSkill,
  setWorkerAvailability,
  updateCertificationStatus,
  updateWorkerProfile,
  workerHasSkill
} from "../models/worker.model";
import type {
  AddCertificationInput,
  AddSkillInput,
  ListWorkersQueryInput,
  SetAvailabilityInput,
  UpdateWorkerProfileInput
} from "../schemas/worker.schema";
import type { AuthUser, UserRole } from "../types";

async function requireWorkerByUserId(userId: string) {
  const worker = await getWorkerByUserId(userId);
  if (!worker) {
    throw ApiError.notFound("WORKER_NOT_FOUND", "Worker profile does not exist");
  }
  return worker;
}

async function requireWorkerById(workerId: string) {
  const worker = await getWorkerById(workerId);
  if (!worker) {
    throw ApiError.notFound("WORKER_NOT_FOUND", "Worker profile does not exist");
  }
  return worker;
}

async function requireAdminScope(role: UserRole, adminUserId: string) {
  if (role === "federation_admin") {
    return { restrict: false, coopIds: [] as string[] };
  }
  if (role !== "coop_admin") {
    throw ApiError.forbidden("FORBIDDEN", "Only cooperative or federation admins can perform this action");
  }
  const coops = await getCooperativesManagedByAdmin(adminUserId);
  return { restrict: true, coopIds: coops.map((coop) => coop.id) };
}

async function assertCanAdminManage(role: UserRole, adminUserId: string, workerCooperativeId: string | null): Promise<void> {
  if (role === "federation_admin") return;
  const coops = await getCooperativesManagedByAdmin(adminUserId);
  if (workerCooperativeId === null) return;
  if (coops.some((coop) => coop.id === workerCooperativeId)) return;
  throw ApiError.forbidden("FORBIDDEN", "This worker belongs to a different cooperative");
}

function assertSelfOrAdmin(user: AuthUser, workerUserId: string, workerCooperativeId: string | null): boolean {
  if (user.sub === workerUserId) return true;
  if (user.role === "federation_admin") return true;
  if (user.role === "coop_admin" && workerCooperativeId === null) return true;
  return false;
}

export async function getOwnWorkerId(userId: string): Promise<string> {
  const worker = await requireWorkerByUserId(userId);
  return worker.id;
}

export async function getWorkerContext(workerId: string) {
  const profile = await getWorkerProfile(workerId);
  if (!profile) {
    throw ApiError.notFound("WORKER_NOT_FOUND", "Worker profile does not exist");
  }
  const skills = await getWorkerSkills(workerId);
  const certifications = await listCertifications(workerId);
  return { profile, skills, certifications };
}

export async function updateMyProfile(user: AuthUser, workerId: string, input: UpdateWorkerProfileInput) {
  const worker = await requireWorkerById(workerId);
  if (!assertSelfOrAdmin(user, worker.user_id, worker.cooperative_id)) {
    if (user.role !== "coop_admin") {
      throw ApiError.forbidden("FORBIDDEN", "You can only update your own worker profile");
    }
    await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  }
  if (input.cooperativeId && !(await cooperativeExists(input.cooperativeId))) {
    throw ApiError.badRequest("COOPERATIVE_NOT_FOUND", "The cooperative does not exist");
  }
  const updated = await updateWorkerProfile(workerId, input);
  return updated;
}

export async function updateAvailability(user: AuthUser, workerId: string, input: SetAvailabilityInput) {
  const worker = await requireWorkerById(workerId);
  if (!assertSelfOrAdmin(user, worker.user_id, worker.cooperative_id)) {
    if (user.role !== "coop_admin") {
      throw ApiError.forbidden("FORBIDDEN", "You can only update your own availability");
    }
    await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  }
  return setWorkerAvailability(workerId, input.isAvailable, input.latitude, input.longitude);
}

export async function addSkillToWorker(user: AuthUser, workerId: string, input: AddSkillInput) {
  const worker = await requireWorkerById(workerId);
  if (!assertSelfOrAdmin(user, worker.user_id, worker.cooperative_id)) {
    if (user.role !== "coop_admin") {
      throw ApiError.forbidden("FORBIDDEN", "You can only manage your own skills");
    }
    await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  }
  const skill = await getSkillById(input.skillId);
  if (!skill) {
    throw ApiError.badRequest("SKILL_NOT_FOUND", "The skill does not exist");
  }
  await addWorkerSkill(workerId, skill.id, input.experienceLevel);
  return { workerId, skill, experienceLevel: input.experienceLevel };
}

export async function removeSkillFromWorker(user: AuthUser, workerId: string, skillId: string) {
  const worker = await requireWorkerById(workerId);
  if (!assertSelfOrAdmin(user, worker.user_id, worker.cooperative_id)) {
    if (user.role !== "coop_admin") {
      throw ApiError.forbidden("FORBIDDEN", "You can only manage your own skills");
    }
    await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  }
  if (!(await workerHasSkill(workerId, skillId))) {
    throw ApiError.notFound("SKILL_NOT_ATTACHED", "This skill is not attached to the worker");
  }
  await removeWorkerSkill(workerId, skillId);
}

export async function addCertificationToWorker(user: AuthUser, workerId: string, input: AddCertificationInput) {
  const worker = await requireWorkerById(workerId);
  if (!assertSelfOrAdmin(user, worker.user_id, worker.cooperative_id)) {
    if (user.role !== "coop_admin") {
      throw ApiError.forbidden("FORBIDDEN", "You can only manage your own certifications");
    }
    await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  }
  const cert = await addCertification(workerId, input);
  return cert;
}

export async function getCertifications(user: AuthUser, workerId: string) {
  const worker = await requireWorkerById(workerId);
  const isOwner = user.sub === worker.user_id;
  const isAdmin = user.role === "federation_admin" || user.role === "coop_admin";
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden("FORBIDDEN", "You cannot view this worker's certifications");
  }
  return listCertifications(workerId);
}

export async function listSkills() {
  return listSkillsCatalog();
}

export async function adminListWorkers(user: AuthUser, query: ListWorkersQueryInput) {
  const scope = await requireAdminScope(user.role, user.sub);
  return listWorkersAdmin({
    status: query.status,
    cooperativeId: query.cooperativeId,
    search: query.search,
    restrictToCoops: scope.restrict,
    coopIds: scope.coopIds
  });
}

export async function verifyWorkerProfile(
  user: AuthUser,
  workerId: string,
  status: "approved" | "rejected",
  note?: string
) {
  const worker = await requireWorkerById(workerId);
  await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  return changeWorkerVerification(workerId, status, user.sub, note);
}

export async function verifyCertification(
  user: AuthUser,
  workerId: string,
  certificationId: string,
  status: "approved" | "rejected"
) {
  const worker = await requireWorkerById(workerId);
  await assertCanAdminManage(user.role, user.sub, worker.cooperative_id);
  const cert = await getCertification(certificationId, workerId);
  if (!cert) {
    throw ApiError.notFound("CERTIFICATION_NOT_FOUND", "Certification not found for this worker");
  }
  const updated = await updateCertificationStatus(certificationId, workerId, status, user.sub);
  return updated;
}