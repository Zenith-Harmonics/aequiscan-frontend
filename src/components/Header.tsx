import { useEffect, useState } from "react";
import { Activity, Radio } from "lucide-react";
import { apiClient } from "../api/client";

export function Header() {
  const [health, setHealth] = useState<{ ok: boolean; version?: string }>({
    ok: false,
  });

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const { data } = await apiClient.GET("/api/v1/health");
        if (mounted && data?.status === "ok") {
          setHealth({ ok: true, version: data.version });
        } else if (mounted) {
          setHealth({ ok: false });
        }
      } catch {
        if (mounted) setHealth({ ok: false });
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-14 shrink-0 border-b border-slate-800 bg-slate-950/95 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
          <Radio className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-slate-100 text-sm uppercase">
            AequiScan
          </span>
          <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
            PLANETARY ANALOG TELEMETRY
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
            health.ok
              ? "bg-emerald-950/60 border-emerald-700/50 text-emerald-400"
              : "bg-rose-950/60 border-rose-700/50 text-rose-400"
          }`}
        >
          <Activity className="w-3 h-3" />
          {health.ok
            ? `API ONLINE v${health.version ?? "0.1.0"}`
            : "API OFFLINE"}
        </span>
      </div>
    </header>
  );
}
