import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useBackendStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    fetch(`${API_URL}/api/v1/health`, { signal: controller.signal })
      .then((res) => {
        setIsOffline(!res.ok);
      })
      .catch(() => {
        // Prinde NetworkError, CORS, Timeout sau 502 fără să crape aplicația
        setIsOffline(true);
      })
      .finally(() => {
        clearTimeout(timer);
        setChecking(false);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return { isOffline, checking };
}
