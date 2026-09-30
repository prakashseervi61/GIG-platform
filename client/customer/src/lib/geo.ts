import type { LocationResult } from "./types";

const KEY = "cg_loc";

export const COIMBATORE: LocationResult = { latitude: 11.0168, longitude: 76.9558, label: "Coimbatore" };

export function locCoords(loc: LocationResult | null | undefined) {
  return {
    lat: loc?.latitude ?? COIMBATORE.latitude,
    lng: loc?.longitude ?? COIMBATORE.longitude
  };
}

export function hasCoords(loc: LocationResult | null | undefined) {
  return loc?.latitude != null;
}

export function getStoredLocation(): LocationResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocationResult) : null;
  } catch {
    return null;
  }
}

export function setStoredLocation(loc: LocationResult) {
  sessionStorage.setItem(KEY, JSON.stringify(loc));
}

const GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";

/** Best-effort place name for GPS coordinates. Never rejects. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `${GEOCODE_URL}?lat=${lat}&lon=${lng}&format=jsonv2&zoom=17&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "coop-gig-platform/1.0 (SIH demo)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const a = data.address ?? {};
    const parts = [
      a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || a.city || a.municipality,
      a.road || a.pedestrian || a.footway,
      a.house_number
    ].filter(Boolean);
    const place = parts.slice(0, 3).join(", ");
    if (place) return place;
    return (data.display_name ?? "").split(",").slice(0, 3).join(", ").trim();
  } catch {
    return "";
  }
}

export function requestLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported by this browser."));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error("Location needs a secure connection (https or localhost)."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        const loc: LocationResult = {
          latitude,
          longitude,
          label: name || "Current location"
        };
        if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
          loc.accuracyM = Math.round(accuracy);
        }
        setStoredLocation(loc);
        resolve(loc);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Allow it in your browser settings, or pick a city.",
          2: "Your location is unavailable right now.",
          3: "Location request timed out. Try again."
        };
        reject(new Error(messages[err.code] ?? err.message ?? "Could not get location"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

export function locLabel(loc: LocationResult | null) {
  if (!loc) return "Location needed";
  if (loc.label) return loc.label;
  return `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`;
}