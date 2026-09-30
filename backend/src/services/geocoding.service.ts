import { ApiError } from "../utils/ApiError";

export interface GeocodedPlace {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(address: string): Promise<GeocodedPlace> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", "en");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "coop-gig-platform/1.0 (SIH demo; contact: demo@coop.example)",
        "Accept-Language": "en"
      },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw ApiError.badGateway("GEOCODING_UNAVAILABLE", "Location lookup service is unavailable right now");
  }

  if (!res.ok) {
    throw ApiError.badGateway("GEOCODING_UNAVAILABLE", "Location lookup service returned an error");
  }

  const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const best = results[0];
  if (!best) {
    throw ApiError.badRequest("LOCATION_NOT_FOUND", "Could not locate that address. Please try a more specific address.");
  }

  const lat = Number(best.lat);
  const lng = Number(best.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw ApiError.badRequest("LOCATION_NOT_FOUND", "Geocoder returned an invalid location for that address");
  }

  return { lat, lng, displayName: best.display_name };
}

/**
 * Best-effort variant for flows where coordinates are a nice-to-have rather
 * than required (e.g. saving an address). Returns null when the geocoder is
 * unreachable or cannot resolve the text, so the record can still be stored.
 */
export async function tryGeocodeAddress(address: string): Promise<GeocodedPlace | null> {
  try {
    return await geocodeAddress(address);
  } catch {
    return null;
  }
}