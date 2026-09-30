import { ApiError } from "../utils/ApiError";
import { searchApprovedWorkers, type ApprovedWorkerResult } from "../models/search.model";
import { getServiceSkillIds } from "../models/service.model";

export type Priority = "normal" | "emergency";

interface Weights {
  skill: number;
  distance: number;
  availability: number;
  rating: number;
  reliability: number;
}

// PRD section 13: 35% skill, 25% distance, 20% availability, 10% rating, 10% reliability.
// Emergency shifts weight toward proximity + availability.
const WEIGHTS: Record<Priority, Weights> = {
  normal: { skill: 0.35, distance: 0.25, availability: 0.2, rating: 0.1, reliability: 0.1 },
  emergency: { skill: 0.2, distance: 0.35, availability: 0.3, rating: 0.1, reliability: 0.05 }
};

export interface MatchCandidate {
  worker: ApprovedWorkerResult;
  score: number;
  breakdown: {
    skill: number;
    distance: number;
    availability: number;
    rating: number;
    reliability: number;
  };
}

export interface MatchInput {
  serviceId?: string;
  category?: string;
  lat: number;
  lng: number;
  radiusKm: number;
  priority: Priority;
  limit: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function computeSkillScore(candidate: ApprovedWorkerResult, serviceSkillIds: string[]): number {
  const relevant = serviceSkillIds.length
    ? candidate.skills.filter((skill) => serviceSkillIds.includes(skill.skillId))
    : null;
  if (relevant) {
    if (relevant.length === 0) return 0;
    return clamp01(Math.max(...relevant.map((skill) => skill.experienceLevel)) / 5);
  }
  if (candidate.skills.length > 0) {
    return clamp01(Math.max(...candidate.skills.map((skill) => skill.experienceLevel)) / 5);
  }
  return 0.5;
}

export async function matchWorkers(input: MatchInput): Promise<MatchCandidate[]> {
  if (!input.serviceId && !input.category) {
    throw ApiError.badRequest("MATCH_FILTER_REQUIRED", "Provide a serviceId or category for matching");
  }

  const serviceSkillIds = input.serviceId ? await getServiceSkillIds(input.serviceId) : [];
  const candidates = await searchApprovedWorkers({
    lat: input.lat,
    lng: input.lng,
    radiusKm: input.radiusKm,
    limit: 100,
    serviceId: input.serviceId,
    category: input.category,
    sort: "distance"
  });

  const weights = WEIGHTS[input.priority];
  const matches = candidates.map((candidate) => {
    const breakdown = {
      skill: computeSkillScore(candidate, serviceSkillIds),
      distance: clamp01(1 - candidate.distanceKm / input.radiusKm),
      availability: candidate.isAvailable ? 1 : 0,
      rating: clamp01(candidate.rating / 5),
      reliability: clamp01(candidate.reliability / 5)
    };
    const score =
      weights.skill * breakdown.skill +
      weights.distance * breakdown.distance +
      weights.availability * breakdown.availability +
      weights.rating * breakdown.rating +
      weights.reliability * breakdown.reliability;
    return { worker: candidate, score: Math.round(score * 10000) / 10000, breakdown };
  });

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, input.limit);
}