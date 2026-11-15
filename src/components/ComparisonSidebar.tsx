import { useEffect, useState, type FormEvent } from "react";
import { Clock, MapPin, Play, Sliders, Sparkles } from "lucide-react";
import type {
  AnalogComparisonRequest,
  SiteQuery,
  TargetSite,
} from "../utils/telemetry";
import { targetSiteToSiteQuery } from "../utils/telemetry";

type MissionProfile = NonNullable<AnalogComparisonRequest["mission_profile"]>;

const PROFILES: { id: MissionProfile; label: string; desc: string }[] = [
  {
    id: "balanced",
    label: "Balanced",
    desc: "Ponderi egale pe toate cele 6 axe științifice",
  },
  {
    id: "traversability",
    label: "Traversability",
    desc: "Prioritizează pantele, rugozitatea și radarul SAR",
  },
  {
    id: "isru_mining",
    label: "ISRU / Mining",
    desc: "Prioritizează mineralogia, gheața și regolitul",
  },
  {
    id: "habitat_subsurface",
    label: "Habitat / Subsurface",
    desc: "Subsol, stabilitate termică și protecție radiații",
  },
  {
    id: "astrobiology",
    label: "Astrobiology",
    desc: "Conservare biosignaturi, filosilicați și umiditate",
  },
];

const SECTOR_KEYS = [
  { key: "1", label: "S1: Geomorphology" },
  { key: "2", label: "S2: Mineralogy" },
  { key: "3", label: "S3: Subsurface SAR" },
  { key: "4", label: "S4: Thermal Env" },
  { key: "5", label: "S5: Atmosphere/Aeolian" },
  { key: "6", label: "S6: Astrobiology" },
];

interface SidebarProps {
  targets: Record<string, Record<string, TargetSite>>;
  artemisSites: TargetSite[];
  catalogLoading: boolean;
  earthQuery: SiteQuery | null;
  selectedEarthId: string;
  onSelectEarthPreset: (id: string) => void;
  loading: boolean;
  onRunComparison: (req: AnalogComparisonRequest) => void;
}

export function ComparisonSidebar({
  targets,
  artemisSites,
  catalogLoading,
  earthQuery,
  selectedEarthId,
  onSelectEarthPreset,
  loading,
  onRunComparison,
}: SidebarProps) {
  const earthEntries = Object.entries(targets.earth ?? {});
  const moonEntries = Object.entries(targets.moon ?? {});
  const marsEntries = Object.entries(targets.mars ?? {});

  const [onlyArtemis, setOnlyArtemis] = useState(false);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>("");
  const [targetQuery, setTargetQuery] = useState<SiteQuery | null>(null);

  const [profile, setProfile] = useState<MissionProfile>("balanced");
  const [useCustomWeights, setUseCustomWeights] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({
    "1": 1,
    "2": 1,
    "3": 1,
    "4": 1,
    "5": 1,
    "6": 1,
  });

  // Inițializează automat prima țintă planetară primită de la API
  useEffect(() => {
    if (selectedTargetKey) return;

    if (marsEntries.length > 0) {
      const [id, site] = marsEntries[0];
      setSelectedTargetKey(`mars:${id}`);
      setTargetQuery(targetSiteToSiteQuery(id, site));
    } else if (moonEntries.length > 0) {
      const [id, site] = moonEntries[0];
      setSelectedTargetKey(`moon:${id}`);
      setTargetQuery(targetSiteToSiteQuery(id, site));
    } else if (artemisSites.length > 0) {
      setSelectedTargetKey("artemis:0");
      setTargetQuery(targetSiteToSiteQuery("artemis_iii_1", artemisSites[0]));
    }
  }, [marsEntries, moonEntries, artemisSites, selectedTargetKey]);

  const handleToggleArtemis = (checked: boolean) => {
    setOnlyArtemis(checked);
    if (checked && artemisSites.length > 0) {
      setSelectedTargetKey("artemis:0");
      setTargetQuery(targetSiteToSiteQuery("artemis_iii_1", artemisSites[0]));
    } else if (!checked) {
      if (marsEntries.length > 0) {
        const [id, site] = marsEntries[0];
        setSelectedTargetKey(`mars:${id}`);
        setTargetQuery(targetSiteToSiteQuery(id, site));
      } else if (moonEntries.length > 0) {
        const [id, site] = moonEntries[0];
        setSelectedTargetKey(`moon:${id}`);
        setTargetQuery(targetSiteToSiteQuery(id, site));
      }
    }
  };

  const handleTargetSelect = (compositeKey: string) => {
    setSelectedTargetKey(compositeKey);
    if (compositeKey.startsWith("artemis:")) {
      const idx = Number(compositeKey.split(":")[1]);
      const site = artemisSites[idx];
      if (site) {
        setTargetQuery(targetSiteToSiteQuery(`artemis_iii_${idx + 1}`, site));
      }
      return;
    }

    const [body, id] = compositeKey.split(":");
    const site = targets[body]?.[id];
    if (site) {
      setTargetQuery(targetSiteToSiteQuery(id, site));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!earthQuery || !targetQuery) return;

    onRunComparison({
      earth_site: earthQuery,
      target_site: targetQuery,
      mission_profile: profile,
      custom_weights: useCustomWeights ? weights : null,
    });
  };

  const hasPlanetaryOptions =
    marsEntries.length > 0 || moonEntries.length > 0 || artemisSites.length > 0;

  return (
    <aside className="w-full lg:w-88 shrink-0 border-r border-slate-800 bg-slate-900/75 p-5 overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. EARTH ANALOG SITE */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> 1. Earth Analog Site (ROI)
          </h2>

          <select
            value={selectedEarthId}
            onChange={(e) => onSelectEarthPreset(e.target.value)}
            disabled={
              catalogLoading &&
              earthEntries.length === 0 &&
              selectedEarthId !== "custom_roi"
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 outline-none disabled:opacity-60"
          >
            {selectedEarthId === "custom_roi" && earthQuery && (
              <option value="custom_roi">✦ {earthQuery.name}</option>
            )}
            {earthEntries.length === 0 && selectedEarthId !== "custom_roi" && (
              <option value="">
                {catalogLoading
                  ? "Se încarcă siturile din API..."
                  : "Trasează un ROI pe hartă"}
              </option>
            )}
            {earthEntries.map(([id, site]) => (
              <option key={id} value={id}>
                {site.name} ({site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°)
              </option>
            ))}
          </select>

          {/* Telemetrie read-only extrasă din hartă + fereastră temporală LATEST */}
          {earthQuery && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-md p-2.5 text-[11px] font-mono text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Lat Span:</span>
                <span className="text-cyan-300">
                  {earthQuery.bbox.min_lat.toFixed(4)}° →{" "}
                  {earthQuery.bbox.max_lat.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span>Lon Span:</span>
                <span className="text-cyan-300">
                  {earthQuery.bbox.min_lon.toFixed(4)}° →{" "}
                  {earthQuery.bbox.max_lon.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> Acquisition:
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 text-[10px]">
                  LATEST ({earthQuery.end_date})
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 2. PLANETARY TARGET (EXCLUSIV DIN API) */}
        <section className="space-y-2.5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 2. Planetary Target
            </h2>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyArtemis}
                onChange={(e) => handleToggleArtemis(e.target.checked)}
                disabled={artemisSites.length === 0}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500"
              />
              Artemis III ({artemisSites.length})
            </label>
          </div>

          <select
            value={selectedTargetKey}
            onChange={(e) => handleTargetSelect(e.target.value)}
            disabled={!hasPlanetaryOptions}
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 focus:border-amber-500 outline-none disabled:opacity-60"
          >
            {!hasPlanetaryOptions ? (
              <option value="">
                {catalogLoading
                  ? "Se încarcă țintele din API..."
                  : "Nicio țintă disponibilă (verifică API)"}
              </option>
            ) : onlyArtemis ? (
              <optgroup label="Moon — Artemis III South Pole Candidates">
                {artemisSites.map((site, idx) => (
                  <option key={idx} value={`artemis:${idx}`}>
                    {site.name} ({site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°)
                  </option>
                ))}
              </optgroup>
            ) : (
              <>
                {marsEntries.length > 0 && (
                  <optgroup label="Mars Targets">
                    {marsEntries.map(([id, site]) => (
                      <option key={`mars:${id}`} value={`mars:${id}`}>
                        [Mars] {site.name} ({site.lat.toFixed(2)}°,{" "}
                        {site.lon.toFixed(2)}°)
                      </option>
                    ))}
                  </optgroup>
                )}
                {moonEntries.length > 0 && (
                  <optgroup label="Moon Targets">
                    {moonEntries.map(([id, site]) => (
                      <option key={`moon:${id}`} value={`moon:${id}`}>
                        [Moon] {site.name} ({site.lat.toFixed(2)}°,{" "}
                        {site.lon.toFixed(2)}°)
                      </option>
                    ))}
                  </optgroup>
                )}
                {artemisSites.length > 0 && (
                  <optgroup label="Artemis III Candidate Regions">
                    {artemisSites.map((site, idx) => (
                      <option key={`artemis:${idx}`} value={`artemis:${idx}`}>
                        [Artemis III] {site.name} ({site.lat.toFixed(2)}°,{" "}
                        {site.lon.toFixed(2)}°)
                      </option>
                    ))}
                  </optgroup>
                )}
              </>
            )}
          </select>

          {targetQuery && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-md p-2.5 text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Selected Body:</span>
              <span className="text-amber-300 uppercase">
                {targetQuery.body} (
                {(
                  (targetQuery.bbox.min_lat + targetQuery.bbox.max_lat) /
                  2
                ).toFixed(2)}
                °,{" "}
                {(
                  (targetQuery.bbox.min_lon + targetQuery.bbox.max_lon) /
                  2
                ).toFixed(2)}
                °)
              </span>
            </div>
          )}
        </section>

        {/* 3. MISSION PROFILE */}
        <section className="space-y-2 pt-4 border-t border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            3. Mission Profile
          </h2>
          <div className="space-y-1.5">
            {PROFILES.map((p) => (
              <label
                key={p.id}
                className={`block p-2 rounded-md border cursor-pointer transition ${
                  profile === p.id
                    ? "bg-cyan-950/40 border-cyan-500/60 text-slate-100"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mission_profile"
                    value={p.id}
                    checked={profile === p.id}
                    onChange={() => setProfile(p.id)}
                    className="text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-semibold">{p.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 pl-5">
                  {p.desc}
                </p>
              </label>
            ))}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setUseCustomWeights(!useCustomWeights)}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <Sliders className="w-3.5 h-3.5" />
              {useCustomWeights
                ? "Ascunde Custom Weights"
                : "Configurează Custom Weights"}
            </button>

            {useCustomWeights && (
              <div className="mt-2.5 p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
                {SECTOR_KEYS.map((s) => (
                  <div key={s.key} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>{s.label}</span>
                      <span className="text-cyan-400">
                        {weights[s.key].toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={0.1}
                      value={weights[s.key]}
                      onChange={(e) =>
                        setWeights({
                          ...weights,
                          [s.key]: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <button
          type="submit"
          disabled={loading || !earthQuery || !targetQuery}
          className="w-full py-2.5 px-4 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-950/50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {loading ? "Interogare STAC / PDS..." : "Run 6-Pillar Comparison"}
        </button>
      </form>
    </aside>
  );
}
