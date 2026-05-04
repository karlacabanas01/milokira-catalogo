import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("q");
  if (!address || address.trim().length < 4) {
    return NextResponse.json({ error: "address muy corta" }, { status: 400 });
  }

  // Reforzamos contexto de búsqueda: Talca, Chile
  const fullQuery = `${address.trim()}, Talca, Chile`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(fullQuery)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MilokiraApp/1.0 (contacto@milokira.cl)",
        "Accept-Language": "es",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "geocoder no respondió" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const first = data[0];
    return NextResponse.json({
      found: true,
      lat: Number(first.lat),
      lng: Number(first.lon),
      display: first.display_name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
