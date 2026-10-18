import { useCallback, useEffect, useState } from "react";
import { loadCatalog, type Catalog } from "./catalog";
export function useCatalog() {
  const [data, setData] = useState<Catalog>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const result = await loadCatalog(force);
      setData(result.data);
      setStale(result.stale);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The catalog is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void loadCatalog()
      .then((result) => {
        if (active) {
          setData(result.data);
          setStale(result.stale);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "The catalog is unavailable.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return { data, loading, error, stale, refresh };
}
