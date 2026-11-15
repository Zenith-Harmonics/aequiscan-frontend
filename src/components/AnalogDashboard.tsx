import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DatabaseBackup,
  ShieldAlert,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AnalogComparisonReport, SectorResult } from "../utils/telemetry";

interface DashboardProps {
  report: AnalogComparisonReport | null;
  loading: boolean;
  error: string | null;
}

export function AnalogDashboard({ report, loading, error }: DashboardProps) {
  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-700/60 text-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono leading-relaxed">{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-28 rounded-xl bg-slate-900 border border-slate-800" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl bg-slate-900 border border-slate-800" />
          <div className="h-80 rounded-xl bg-slate-900 border border-slate-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-slate-900 border border-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-mono uppercase tracking-wider text-cyan-400">
            Awaiting Telemetry Query
          </p>
          <p className="text-xs text-slate-400">
            Selectează un sit preîncărcat sau trasează un contur pe harta
            satelitară din panoul stâng, alege ținta planetară și rulează
            comparația multi-sectorială pe cei 6 piloni.
          </p>
        </div>
      </div>
    );
  }

  const similarityPct = Number(
    (report.overall_similarity_score * 100).toFixed(1),
  );
  const confidencePct = Number((report.overall_confidence * 100).toFixed(1));

  const radarData = report.sector_results.map((s) => ({
    subject: `S${s.sector}: ${s.name.split("&")[0].trim()}`,
    score: Number((s.score * 100).toFixed(1)),
    confidence: Number((s.confidence * 100).toFixed(1)),
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPI HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="md:col-span-2 flex items-center gap-5">
          <RadialGauge percentage={similarityPct} />
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Analog Comparison Pair
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-0.5">
              {report.earth_site.name}{" "}
              <span className="text-cyan-400 font-mono text-sm">↔</span>{" "}
              {report.target_site.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Profile: {report.mission_profile}
              </span>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Target Body: {report.target_site.body}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-center">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Overall Similarity Index
          </span>
          <span className="text-3xl font-bold font-mono text-cyan-400 mt-1">
            {similarityPct}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Renormalizat pe sectoarele active
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-center">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Satellite Data Confidence
          </span>
          <span className="text-3xl font-bold font-mono text-emerald-400 mt-1">
            {confidencePct}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Acoperire senzori orbitali / DEM / SAR
          </span>
        </div>
      </div>

      {/* RADAR + EXECUTIVE SYNTHESIS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            6-Pillar Scientific Fingerprint
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <Radar
                  name="Similarity (%)"
                  dataKey="score"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.28}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    fontSize: "12px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/90 border border-emerald-900/50 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Key Analog Strengths
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              {(report.key_strengths ?? []).length > 0 ? (
                report.key_strengths!.map((item, i) => (
                  <li
                    key={i}
                    className="p-2 rounded bg-emerald-950/25 border border-emerald-900/40"
                  >
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-slate-500 italic">
                  Nicio analogie puternică raportată.
                </li>
              )}
            </ul>
          </div>

          <div className="bg-slate-900/90 border border-amber-900/50 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Critical Divergences
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              {(report.key_divergences ?? []).length > 0 ? (
                report.key_divergences!.map((item, i) => (
                  <li
                    key={i}
                    className="p-2 rounded bg-amber-950/25 border border-amber-900/40"
                  >
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-slate-500 italic">
                  Nicio divergență critică semnalată.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 6 EXPANDABLE SECTOR CARDS */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Sector-by-Sector Telemetry Breakdown
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {report.sector_results.map((sector) => (
            <SectorCard key={sector.sector} sector={sector} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectorCard({ sector }: { sector: SectorResult }) {
  const isInactive = sector.confidence === 0.0;
  const [expanded, setExpanded] = useState(!isInactive);

  const scorePct = (sector.score * 100).toFixed(1);
  const confPct = (sector.confidence * 100).toFixed(0);
  const contribPct = (sector.weighted_contribution * 100).toFixed(1);

  return (
    <div
      className={`rounded-xl border transition ${
        isInactive
          ? "bg-slate-900/40 border-slate-800/80"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
              P{sector.sector}
            </span>
            <h3 className="text-sm font-semibold text-slate-100">
              {sector.name}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono">
            {isInactive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                <DatabaseBackup className="w-3 h-3" />
                Insufficient Data / Inactive
              </span>
            ) : (
              <>
                <span className="text-cyan-400 font-bold">
                  Score: {scorePct}%
                </span>
                <span className="text-slate-400">Confidence: {confPct}%</span>
                <span className="text-slate-500">
                  Weighted Contrib: +{contribPct}%
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-slate-400">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-3">
          {sector.explanation && (
            <p className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded border border-slate-800/80 leading-relaxed">
              {sector.explanation}
            </p>
          )}

          {(sector.metrics ?? []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-1.5 pr-2">Metric</th>
                    <th className="py-1.5 px-2">Earth</th>
                    <th className="py-1.5 px-2">Target</th>
                    <th className="py-1.5 pl-2 w-28">Similarity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {sector.metrics!.map((m, idx) => {
                    const simPct = Math.round(m.similarity * 100);
                    return (
                      <tr key={idx}>
                        <td className="py-2 pr-2 font-sans text-slate-200">
                          {m.name}{" "}
                          {m.unit && (
                            <span className="text-slate-500 text-[10px]">
                              ({m.unit})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-cyan-300">
                          {m.earth_value !== null && m.earth_value !== undefined
                            ? String(m.earth_value)
                            : "—"}
                        </td>
                        <td className="py-2 px-2 text-amber-300">
                          {m.target_value !== null &&
                          m.target_value !== undefined
                            ? String(m.target_value)
                            : "—"}
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500"
                                style={{
                                  width: `${Math.min(100, Math.max(0, simPct))}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 w-8 text-right">
                              {simPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RadialGauge({ percentage }: { percentage: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference -
    (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#1e293b"
          strokeWidth="7"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#22d3ee"
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="absolute font-mono text-sm font-bold text-slate-100">
        {percentage}%
      </span>
    </div>
  );
}
