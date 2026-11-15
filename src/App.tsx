import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { apiClient } from "./api/client";
import { AnalogDashboard } from "./components/AnalogDashboard";
import { ComparisonSidebar } from "./components/ComparisonSidebar";
import { EarthRoiMap, type ExtractedRoi } from "./components/EarthRoiMap";
import { Header } from "./components/Header";
import {
  type AnalogComparisonReport,
  type AnalogComparisonRequest,
  formatApiError,
  getLatestDateRange,
  type SiteQuery,
  type TargetSite,
  targetSiteToSiteQuery,
} from "./utils/telemetry";

export function App() {
  const [targets, setTargets] = useState<
    Record<string, Record<string, TargetSite>>
  >({});
  const [artemisSites, setArtemisSites] = useState<TargetSite[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);

  const [selectedEarthId, setSelectedEarthId] = useState<string>("");
  const [earthQuery, setEarthQuery] = useState<SiteQuery | null>(null);

  const [mainView, setMainView] = useState<"map" | "report">("map");
  const [report, setReport] = useState<AnalogComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [allRes, artemisRes] = await Promise.all([
        apiClient.GET("/api/v1/targets/", {
          signal: AbortSignal.timeout(4000),
        }),
        apiClient.GET("/api/v1/targets/moon/artemis-iii", {
          signal: AbortSignal.timeout(4000),
        }),
      ]);

      if (allRes.error || !allRes.data) {
        setBackendOffline(true);
        return;
      }

      setBackendOffline(false);
      setTargets(allRes.data);
      const firstEarth = Object.entries(allRes.data.earth ?? {})[0];
      if (firstEarth) {
        setSelectedEarthId(firstEarth[0]);
        setEarthQuery(targetSiteToSiteQuery(firstEarth[0], firstEarth[1]));
      }

      if (artemisRes.data) {
        setArtemisSites(artemisRes.data);
      }
    } catch {
      // Backend stopped, blocked, or timed out -> the map remains active
      setBackendOffline(true);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const handleSelectEarthPreset = (id: string) => {
    setSelectedEarthId(id);
    const site = targets.earth?.[id];
    if (site) {
      setEarthQuery(targetSiteToSiteQuery(id, site));
      setMainView("map");
    }
  };

  const handleMapRoiChange = (roi: ExtractedRoi) => {
    const { start_date, end_date } = getLatestDateRange();
    setSelectedEarthId("custom_roi");
    setEarthQuery({
      site_id: "custom_roi",
      name: `Custom ROI (${roi.centerLat.toFixed(2)}°, ${roi.centerLon.toFixed(2)}°)`,
      body: "earth",
      bbox: roi.bbox,
      start_date,
      end_date,
    });
  };

  const displayBbox = earthQuery?.bbox ?? {
    min_lon: 20.0,
    min_lat: 25.0,
    max_lon: 35.0,
    max_lat: 38.0,
  };

  const handleRunComparison = async (req: AnalogComparisonRequest) => {
    if (backendOffline) {
      setError("Backend offline — the API server is not responding right now.");
      setMainView("report");
      return;
    }

    setLoading(true);
    setError(null);
    setMainView("report");

    try {
      const {
        data,
        error: apiErr,
        response,
      } = await apiClient.POST("/api/v1/analogs/compare", {
        body: req,
        signal: AbortSignal.timeout(60000),
      });

      if (apiErr || !data) {
        setError(formatApiError(response.status, apiErr));
        return;
      }

      setReport(data);
    } catch {
      setBackendOffline(true);
      setError("Backend offline — the API server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <Header />

      {backendOffline && (
        <div
          role="status"
          className="shrink-0 bg-amber-500/15 border-b border-amber-500/40 text-amber-200 px-5 py-2 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              <strong>Backend offline</strong> — the API is not responding. You
              can continue exploring the map and selecting ROI areas.
            </span>
          </div>
          <button
            type="button"
            onClick={loadCatalogs}
            disabled={catalogLoading}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-medium transition disabled:opacity-50"
          >
            {catalogLoading ? "Checking..." : "Retry"}
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <ComparisonSidebar
          targets={targets}
          artemisSites={artemisSites}
          catalogLoading={catalogLoading}
          earthQuery={earthQuery}
          selectedEarthId={selectedEarthId}
          onSelectEarthPreset={handleSelectEarthPreset}
          loading={loading}
          onRunComparison={handleRunComparison}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {(report || error || loading) && (
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
                  6-Pillar Telemetry Report
                </button>
              </div>
            </div>
          )}

          {mainView === "map" ? (
            <div className="flex-1 relative">
              <EarthRoiMap
                bbox={displayBbox}
                siteName={earthQuery?.name ?? "Select or draw ROI"}
                onRoiChange={handleMapRoiChange}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <AnalogDashboard
                report={report}
                loading={loading}
                error={error}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
