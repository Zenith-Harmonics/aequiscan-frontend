import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, FlaskConical, Map, Play, ShieldAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "../api/client";
import type {
  MineralogyCompareResponse,
  MineralWeights,
  TargetSite,
} from "../utils/telemetry";
import { formatApiError, MINERAL_CLASS_LABELS } from "../utils/telemetry";
import { EarthRoiMap, type ExtractedRoi } from "./EarthRoiMap";

interface MineralogyLabProps {
  targets: Record<string, Record<string, TargetSite>>;
  catalogLoading: boolean;
}

export function MineralogyLab({ targets, catalogLoading }: MineralogyLabProps) {
  const earthEntries = Object.entries(targets.earth ?? {});
  const moonTargets = Object.entries(targets.moon ?? {});
  const marsTargets = Object.entries(targets.mars ?? {});

  const [selectedEarthPreset, setSelectedEarthPreset] = useState("");
  const [earthSiteName, setEarthSiteName] = useState("Select or draw ROI");
  const [earthLat, setEarthLat] = useState(37.55);
  const [earthLon, setEarthLon] = useState(90.55);
  const [earthRadius, setEarthRadius] = useState(2000);
  const [mapBbox, setMapBbox] = useState({
    min_lat: 37.5,
    max_lat: 37.6,
    min_lon: 90.5,
    max_lon: 90.6,
  });

  const [selectedPlanetaryKey, setSelectedPlanetaryKey] = useState<string>("");
  const [simulate, setSimulate] = useState(false);

  const [weights, setWeights] = useState<MineralWeights>({
    mafic_olivine_pyroxene: 1.0,
    plagioclase_anorthosite: 1.0,
    phyllosilicates_clays: 1.0,
    sulfates_evaporites: 1.0,
    carbonates: 1.0,
    iron_oxides_hydroxides: 1.0,
  });

  const [mainView, setMainView] = useState<"map" | "report">("map");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MineralogyCompareResponse | null>(null);

  // Inițializează situl terestru implicit din API
  useEffect(() => {
    if (selectedEarthPreset || earthEntries.length === 0) return;
    const [id, site] = earthEntries[0];
    setSelectedEarthPreset(id);
    setEarthSiteName(site.name);
    setEarthLat(site.lat);
    setEarthLon(site.lon);
    setEarthRadius(site.radius_m ?? 2000);
    const deg = (site.radius_m ?? 2000) / 111_320;
    setMapBbox({
      min_lat: site.lat - deg,
      max_lat: site.lat + deg,
      min_lon: site.lon - deg,
      max_lon: site.lon + deg,
    });
  }, [earthEntries, selectedEarthPreset]);

  // Inițializează ținta planetară implicită din API
  useEffect(() => {
    if (selectedPlanetaryKey) return;
    if (marsTargets.length > 0) {
      setSelectedPlanetaryKey(`mars:${marsTargets[0][0]}`);
    } else if (moonTargets.length > 0) {
      setSelectedPlanetaryKey(`moon:${moonTargets[0][0]}`);
    }
  }, [marsTargets, moonTargets, selectedPlanetaryKey]);

  const handleEarthPresetChange = (id: string) => {
    setSelectedEarthPreset(id);
    const site = targets.earth?.[id];
    if (site) {
      setEarthSiteName(site.name);
      setEarthLat(site.lat);
      setEarthLon(site.lon);
      setEarthRadius(site.radius_m ?? 2000);
      const deg = (site.radius_m ?? 2000) / 111_320;
      setMapBbox({
        min_lat: site.lat - deg,
        max_lat: site.lat + deg,
        min_lon: site.lon - deg,
        max_lon: site.lon + deg,
      });
      setMainView("map");
    }
  };

  const handleMapRoiChange = (roi: ExtractedRoi) => {
    setSelectedEarthPreset("custom_roi");
    setEarthSiteName(
      `Custom ROI (${roi.centerLat.toFixed(2)}°, ${roi.centerLon.toFixed(2)}°)`,
    );
    setEarthLat(roi.centerLat);
    setEarthLon(roi.centerLon);
    setEarthRadius(Math.max(250, roi.radiusM));
    setMapBbox(roi.bbox);
  };

  const handleRun = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPlanetaryKey) return;

    if (earthLat < -54 || earthLat > 54) {
      setError(
        "Latitudinea centrului ROI trebuie să fie între -54° și +54° (acoperirea orbitală ISS / NASA EMIT).",
      );
      setMainView("report");
      return;
    }

    const [planetaryBody, targetId] = selectedPlanetaryKey.split(":") as [
      "mars" | "moon",
      string,
    ];

    setLoading(true);
    setError(null);
    setMainView("report");

    const {
      data,
      error: apiErr,
      response,
    } = await apiClient.POST("/api/v1/mineralogy/compare", {
      body: {
        earth_lat: earthLat,
        earth_lon: earthLon,
        earth_radius_m: earthRadius,
        planetary_target_id: targetId,
        planetary_body: planetaryBody,
        weights,
        simulate,
      },
    });

    setLoading(false);

    if (apiErr || !data) {
      setError(formatApiError(response.status, apiErr));
      return;
    }

    setResult(data);
  };

  const chartData = result
    ? Object.keys(MINERAL_CLASS_LABELS).map((cls) => ({
        name: MINERAL_CLASS_LABELS[cls].split("/")[0].trim(),
        Earth: Number(
          (
            (result.asi.earth_profile.harmonized_profile[cls] ?? 0) * 100
          ).toFixed(2),
        ),
        Planetary: Number(
          (
            (result.asi.planetary_profile.harmonized_profile[cls] ?? 0) * 100
          ).toFixed(2),
        ),
      }))
    : [];

  const hasPlanetaryOptions = marsTargets.length > 0 || moonTargets.length > 0;

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-full lg:w-88 shrink-0 border-r border-slate-800 bg-slate-900/75 p-5 overflow-y-auto">
        <form onSubmit={handleRun} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" /> EMIT vs. PDS ODE
            </h2>
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulate}
                onChange={(e) => setSimulate(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-500"
              />
              Simulate
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Earth Analog Reference / ROI
            </label>
            <select
              value={selectedEarthPreset}
              onChange={(e) => handleEarthPresetChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100"
            >
              {selectedEarthPreset === "custom_roi" && (
                <option value="custom_roi">✦ {earthSiteName}</option>
              )}
              {earthEntries.length === 0 &&
                selectedEarthPreset !== "custom_roi" && (
                  <option value="">
                    {catalogLoading
                      ? "Se încarcă din API..."
                      : "Trasează un ROI pe hartă"}
                  </option>
                )}
              {earthEntries.map(([id, s]) => (
                <option key={id} value={id}>
                  {s.name} ({s.lat.toFixed(2)}°, {s.lon.toFixed(2)}°)
                </option>
              ))}
            </select>

            <div className="bg-slate-950/90 border border-slate-800 rounded-md p-2.5 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Centroid:</span>
                <span className="text-cyan-300">
                  {earthLat.toFixed(4)}°, {earthLon.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span>Radius ROI:</span>
                <span className="text-cyan-300">{earthRadius} m</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Planetary Reference Target
            </label>
            <select
              value={selectedPlanetaryKey}
              onChange={(e) => setSelectedPlanetaryKey(e.target.value)}
              disabled={!hasPlanetaryOptions}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 disabled:opacity-60"
            >
              {!hasPlanetaryOptions ? (
                <option value="">
                  {catalogLoading
                    ? "Se încarcă țintele din API..."
                    : "Nicio țintă disponibilă (verifică API)"}
                </option>
              ) : (
                <>
                  {marsTargets.length > 0 && (
                    <optgroup label="Mars (CRISM / OMEGA)">
                      {marsTargets.map(([id, s]) => (
                        <option key={id} value={`mars:${id}`}>
                          [Mars] {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {moonTargets.length > 0 && (
                    <optgroup label="Moon (M3 / Diviner)">
                      {moonTargets.map(([id, s]) => (
                        <option key={id} value={`moon:${id}`}>
                          [Moon] {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300">
              Harmonized Mineral Weights
            </div>
            {(Object.keys(weights) as (keyof MineralWeights)[]).map((key) => (
              <div key={key} className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{MINERAL_CLASS_LABELS[key]}</span>
                  <span className="text-cyan-400">
                    {weights[key].toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.1}
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights({
                      ...weights,
                      [key]: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedPlanetaryKey}
            className="w-full py-2.5 px-4 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? "Interogare NASA EMIT..." : "Compare Mineralogy"}
          </button>
        </form>
      </aside>

      {/* MAIN AREA: HARTĂ SATELITARĂ SAU REZULTAT ASI */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {(result || error || loading) && (
          <div className="h-11 shrink-0 border-b border-slate-800 bg-slate-900/50 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMainView("map")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                  mainView === "map"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Satellite ROI Map
              </button>
              <button
                type="button"
                onClick={() => setMainView("report")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                  mainView === "report"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                ASI Spectral Report
              </button>
            </div>
          </div>
        )}

        {mainView === "map" ? (
          <div className="flex-1 relative">
            <EarthRoiMap
              bbox={mapBbox}
              siteName={earthSiteName}
              onRoiChange={handleMapRoiChange}
            />
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-700/60 text-rose-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs font-mono">{error}</div>
              </div>
            )}

            {loading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-24 rounded-xl bg-slate-900 border border-slate-800" />
                <div className="h-80 rounded-xl bg-slate-900 border border-slate-800" />
              </div>
            )}

            {!loading && result && (
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-slate-400">
                      Hyperspectral Analog Comparison
                    </div>
                    <h1 className="text-lg font-bold text-slate-100 mt-0.5">
                      {result.earth_site_name}{" "}
                      <span className="text-cyan-400">↔</span>{" "}
                      {result.planetary_site_name} (
                      {result.planetary_body.toUpperCase()})
                    </h1>
                  </div>
                  <div className="bg-slate-950 border border-cyan-500/40 rounded-lg px-5 py-3 text-right">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Mineralogy ASI Score
                    </div>
                    <div className="text-3xl font-bold font-mono text-cyan-400">
                      {(result.asi.asi_score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
                    Harmonized Mineral Abundances (%) — Earth EMIT vs. Planetary
                    Profile
                  </h2>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                        />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            fontSize: "12px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="Earth"
                          fill="#22d3ee"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Planetary"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GranuleCard
                    title="Earth EMIT Granule Metadata"
                    profile={result.asi.earth_profile}
                  />
                  <GranuleCard
                    title="Planetary PDS Granule Metadata"
                    profile={result.asi.planetary_profile}
                  />
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 overflow-x-auto">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                    Axis-by-Axis Delta Breakdown
                  </h2>
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                        <th className="py-2">Mineral Class</th>
                        <th className="py-2">Earth Fraction</th>
                        <th className="py-2">Planetary Fraction</th>
                        <th className="py-2">Abs Delta (|Δ|)</th>
                        <th className="py-2">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {result.asi.axis_details.map((row) => (
                        <tr key={row.mineral_class}>
                          <td className="py-2 font-sans text-slate-200">
                            {MINERAL_CLASS_LABELS[row.mineral_class] ??
                              row.mineral_class}
                          </td>
                          <td className="py-2 text-cyan-400">
                            {(row.earth_fraction * 100).toFixed(2)}%
                          </td>
                          <td className="py-2 text-amber-400">
                            {(row.planetary_fraction * 100).toFixed(2)}%
                          </td>
                          <td className="py-2 text-slate-300">
                            {(row.abs_delta * 100).toFixed(2)}%
                          </td>
                          <td className="py-2 text-slate-400">
                            {row.weight.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function GranuleCard({
  title,
  profile,
}: {
  title: string;
  profile: MineralogyCompareResponse["asi"]["earth_profile"];
}) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs font-mono">
      <h3 className="font-sans font-bold text-slate-200">{title}</h3>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div>
          Source: <span className="text-slate-200">{profile.source}</span>
        </div>
        <div>
          Valid Pixels:{" "}
          <span className="text-slate-200">
            {profile.n_valid_mineral_pixels ?? "N/A"}
          </span>
        </div>
        <div>
          Total Pixels:{" "}
          <span className="text-slate-200">{profile.n_pixels ?? "N/A"}</span>
        </div>
        <div>
          Mean Band Depth:{" "}
          <span className="text-slate-200">
            {profile.mean_band_depth !== null &&
            profile.mean_band_depth !== undefined
              ? profile.mean_band_depth.toFixed(4)
              : "N/A"}
          </span>
        </div>
      </div>
      {profile.top_raw_minerals && profile.top_raw_minerals.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[10px] uppercase text-slate-500 mb-1">
            Top Raw Minerals
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.top_raw_minerals.map((pair, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-cyan-300"
              >
                {String(pair[0])}: {String(pair[1])}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
