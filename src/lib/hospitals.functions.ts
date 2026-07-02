import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(500).max(50_000).default(5000),
});

interface Hospital {
  place_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number;
  emergency_24h?: boolean;
  distance_m?: number;
  phone?: string;
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const searchNearbyHospitals = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<Hospital[]> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) throw new Error("Google Maps connector missing");

    const res = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchNearby", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber,places.currentOpeningHours,places.regularOpeningHours,places.types",
      },
      body: JSON.stringify({
        includedTypes: ["hospital"],
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude: data.lat, longitude: data.lng }, radius: data.radiusMeters },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Places ${res.status}: ${t}`);
    }
    const json = await res.json();
    const places = (json.places ?? []) as Array<Record<string, unknown>>;

    const results: Hospital[] = places.map((p) => {
      const loc = (p.location as { latitude: number; longitude: number } | undefined);
      const display = p.displayName as { text?: string } | undefined;
      const oh = (p.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined);
      const open247 = Array.isArray(oh?.weekdayDescriptions) && oh!.weekdayDescriptions!.some((d) => /open 24 hours/i.test(d));
      const lat = loc?.latitude ?? 0;
      const lng = loc?.longitude ?? 0;
      return {
        place_id: String(p.id ?? ""),
        name: display?.text ?? "Hospital",
        address: (p.formattedAddress as string | undefined) ?? "",
        lat, lng,
        rating: typeof p.rating === "number" ? p.rating : undefined,
        emergency_24h: open247,
        distance_m: Math.round(haversine(data.lat, data.lng, lat, lng)),
      };
    });

    results.sort((a, b) => {
      if (!!a.emergency_24h !== !!b.emergency_24h) return a.emergency_24h ? -1 : 1;
      return (a.distance_m ?? 0) - (b.distance_m ?? 0);
    });
    return results;
  });
