import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/geocode?q=池袋駅  — forward geocode (search)
// GET /api/v1/geocode?lat=35.7&lng=139.7 — reverse geocode
// Uses Nominatim (OpenStreetMap) — no API key required
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  const headers = {
    "User-Agent": "DeepExperience/1.0 (admin geocode proxy)",
    "Accept-Language": "ja",
  };

  try {
    if (q) {
      // Forward geocode
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=jp`,
        { headers }
      );
      const data = await res.json();
      return NextResponse.json(
        data.map((r: any) => ({
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          name: r.name || "",
          displayName: r.display_name || "",
        }))
      );
    }

    if (lat && lng) {
      // Reverse geocode
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers }
      );
      const data = await res.json();
      return NextResponse.json({
        name: data.name || data.address?.road || "",
        displayName: data.display_name || "",
        address: data.address || {},
      });
    }

    return NextResponse.json({ error: "q or lat/lng required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }
}
