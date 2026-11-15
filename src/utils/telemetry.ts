import type { components } from "../api/generated/schema";

export type TargetSite = components["schemas"]["TargetSite"];
export type SiteQuery = components["schemas"]["SiteQuery"];
export type AnalogComparisonRequest =
  components["schemas"]["AnalogComparisonRequest"];
export type AnalogComparisonReport =
  components["schemas"]["AnalogComparisonReport"];
export type SectorResult = components["schemas"]["SectorResult"];
export type MineralogyCompareRequest =
  components["schemas"]["MineralogyCompareRequest"];
export type MineralogyCompareResponse =
  components["schemas"]["MineralogyCompareResponse"];
export type MineralWeights = components["schemas"]["MineralWeights"];

export const MINERAL_CLASS_LABELS: Record<string, string> = {
  mafic_olivine_pyroxene: "Mafic (Olivine / Pyroxene)",
  plagioclase_anorthosite: "Plagioclase / Anorthosite",
  phyllosilicates_clays: "Phyllosilicates / Clays",
  sulfates_evaporites: "Sulfates / Evaporites",
  carbonates: "Carbonates",
  iron_oxides_hydroxides: "Iron Oxides / Hydroxides",
};

export function getLatestDateRange(): { start_date: string; end_date: string } {
  const now = new Date();
  const end_date = now.toISOString().slice(0, 10);

  const past = new Date(now);
  past.setFullYear(past.getFullYear() - 2);
  const start_date = past.toISOString().slice(0, 10);

  return { start_date, end_date };
}

export function targetSiteToSiteQuery(
  siteId: string,
  site: TargetSite,
): SiteQuery {
  const radiusM = site.radius_m ?? 2000;
  const degLat = radiusM / 111_320;
  const cosLat = Math.max(0.1, Math.cos((site.lat * Math.PI) / 180));
  const degLon = degLat / cosLat;
  const { start_date, end_date } = getLatestDateRange();

  return {
    site_id: siteId,
    name: site.name,
    body: site.body,
    bbox: {
      min_lon: Number((site.lon - degLon).toFixed(5)),
      min_lat: Number((site.lat - degLat).toFixed(5)),
      max_lon: Number((site.lon + degLon).toFixed(5)),
      max_lat: Number((site.lat + degLat).toFixed(5)),
    },
    start_date,
    end_date,
  };
}

export function formatApiError(status: number, error: unknown): string {
  const detail =
    typeof error === "object" && error !== null && "detail" in error
      ? String((error as { detail: unknown }).detail)
      : JSON.stringify(error);

  switch (status) {
    case 400:
      return `Coordonate în afara acoperirii senzorului sau corp nesuportat (400): ${detail}`;
    case 404:
      return `Nu s-au găsit granule sau ținta nu există în catalog (404): ${detail}`;
    case 422:
      return `Parametri invalizi în cerere (422): ${detail}`;
    case 502:
      return `Eroare upstream NASA EMIT / PDS ODE (502). Încearcă modul Simulate sau reîncearcă: ${detail}`;
    default:
      return `Eroare API (${status}): ${detail}`;
  }
}
