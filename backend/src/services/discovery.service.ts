import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import { listServices, getServiceById } from "../models/service.model";
import {
  getCustomerLocation,
  upsertCustomerLocation,
  listCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
  type CustomerAddressRow
} from "../models/customer.model";
import { searchApprovedWorkers } from "../models/search.model";
import { geocodeAddress, tryGeocodeAddress } from "./geocoding.service";
import type {
  CreateAddressInput,
  SaveLocationInput,
  SearchWorkersQueryInput,
  UpdateAddressInput
} from "../schemas/discovery.schema";

export async function listServiceCatalog(filter: {
  category?: string;
  search?: string;
  sort?: "popular";
}) {
  const rows = await listServices(filter);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    basePrice: Number(r.base_price),
    emergencyAvailable: r.emergency_available,
    bookingCount: r.booking_count,
    skills: r.skills
  }));
}

export async function getService(id: string) {
  const row = await getServiceById(id);
  if (!row) {
    throw ApiError.notFound("SERVICE_NOT_FOUND", "Service not found");
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    basePrice: Number(row.base_price),
    emergencyAvailable: row.emergency_available,
    skills: row.skills
  };
}

export async function getMyLocation(user: AuthUser) {
  const row = await getCustomerLocation(user.sub);
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude
  };
}

export async function saveMyLocation(user: AuthUser, input: SaveLocationInput) {
  const hasCoords = input.latitude != null && input.longitude != null;
  let latitude = input.latitude ?? null;
  let longitude = input.longitude ?? null;

  if (!hasCoords) {
    const place = await geocodeAddress(input.address);
    latitude = place.lat;
    longitude = place.lng;
  }

  const saved = await upsertCustomerLocation({
    userId: user.sub,
    label: input.label ?? null,
    address: input.address,
    latitude,
    longitude
  });

  return {
    id: saved.id,
    label: saved.label,
    address: saved.address,
    latitude: saved.latitude,
    longitude: saved.longitude,
    updatedAt: saved.updated_at
  };
}

function toAddressDto(row: CustomerAddressRow) {
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function resolveCoords(
  address: string,
  latitude?: number,
  longitude?: number
): Promise<{ latitude: number | null; longitude: number | null }> {
  if (latitude != null && longitude != null) return { latitude, longitude };
  // geocoding is best-effort here: a saved address stays useful without a pin
  const place = await tryGeocodeAddress(address);
  return { latitude: place?.lat ?? null, longitude: place?.lng ?? null };
}

export async function listMyAddresses(user: AuthUser) {
  const rows = await listCustomerAddresses(user.sub);
  return rows.map(toAddressDto);
}

export async function addMyAddress(user: AuthUser, input: CreateAddressInput) {
  const coords = await resolveCoords(input.address, input.latitude, input.longitude);
  const saved = await createCustomerAddress({
    userId: user.sub,
    label: input.label,
    address: input.address,
    latitude: coords.latitude,
    longitude: coords.longitude,
    isDefault: input.isDefault
  });
  return toAddressDto(saved);
}

export async function editMyAddress(user: AuthUser, id: string, input: UpdateAddressInput) {
  const patch: Parameters<typeof updateCustomerAddress>[2] = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.address !== undefined) patch.address = input.address;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.isDefault !== undefined) patch.isDefault = input.isDefault;

  if (input.address !== undefined && (input.latitude !== undefined || input.longitude !== undefined)) {
    const coords = await resolveCoords(input.address, input.latitude, input.longitude);
    patch.latitude = coords.latitude;
    patch.longitude = coords.longitude;
  }

  const updated = await updateCustomerAddress(user.sub, id, patch);
  if (!updated) throw ApiError.notFound("ADDRESS_NOT_FOUND", "Address not found");

  // isDefault was requested alongside other edits: apply it as its own step
  if (input.isDefault === true && !updated.is_default) {
    const promoted = await setDefaultCustomerAddress(user.sub, id);
    if (promoted) return toAddressDto(promoted);
  }
  return toAddressDto(updated);
}

export async function makeMyAddressDefault(user: AuthUser, id: string) {
  const updated = await setDefaultCustomerAddress(user.sub, id);
  if (!updated) throw ApiError.notFound("ADDRESS_NOT_FOUND", "Address not found");
  return toAddressDto(updated);
}

export async function removeMyAddress(user: AuthUser, id: string): Promise<void> {
  const removed = await deleteCustomerAddress(user.sub, id);
  if (!removed) throw ApiError.notFound("ADDRESS_NOT_FOUND", "Address not found");
}

export async function searchNearbyWorkers(query: SearchWorkersQueryInput) {
  const results = await searchApprovedWorkers({
    lat: query.lat,
    lng: query.lng,
    radiusKm: query.radiusKm,
    limit: query.limit,
    serviceId: query.serviceId,
    category: query.category,
    minRating: query.minRating,
    maxPrice: query.maxPrice,
    sort: query.sort
  });
  return results;
}