import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Catalog } from "../lib/catalog";
import { usePreferences } from "../lib/preferences";
import { useStore } from "../lib/store";
import { flag, localeCountry } from "../lib/locale";
export default function RegionPicker({ data }: { data: Catalog }) {
  const reduced = useReducedMotion();
  const lastRegion = usePreferences((s) => s.lastRegion);
  const choose = useStore((s) => s.choose);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"countries" | "regions" | "categories">(
    "countries",
  );
  const [limit, setLimit] = useState(24);
  const locale = localeCountry(navigator.language);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const c of data.channels)
      result.set(c.country, (result.get(c.country) ?? 0) + 1);
    return result;
  }, [data]);
  const countries = useMemo(
    () =>
      data.countries
        .filter((c) => counts.has(c.code))
        .sort(
          (a, b) =>
            Number(b.code === locale) - Number(a.code === locale) ||
            (counts.get(b.code) ?? 0) - (counts.get(a.code) ?? 0),
        ),
    [data, counts, locale],
  );
  const items =
    tab === "countries"
      ? countries.map((c) => ({
          code: c.code,
          name: c.name,
          count: counts.get(c.code) ?? 0,
          type: "country" as const,
          icon: flag(c.code),
        }))
      : tab === "regions"
        ? data.regions.map((r) => ({
            ...r,
            count: r.countries.reduce(
              (sum, c) => sum + (counts.get(c) ?? 0),
              0,
            ),
            type: "region" as const,
            icon: "◎",
          }))
        : data.categories.map((c) => ({
            code: c.id,
            name: c.name,
            count: data.channels.filter((ch) => ch.categories.includes(c.id))
              .length,
            type: "category" as const,
            icon: "▤",
          }));
  const filtered = items.filter(
    (c) => c.count > 0 && c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      {lastRegion && (
        <button className="resume-region" onClick={() => choose(lastRegion)}>
          ↶ Back to {lastRegion.name} <span>Your last destination →</span>
        </button>
      )}
      <div className="picker-toolbar">
        <div className="segmented" role="group" aria-label="Browse by">
          {(["countries", "regions", "categories"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setLimit(24);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label={`Find ${tab}`}
            placeholder={`Find ${tab}…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(24);
            }}
          />
        </label>
      </div>
      <button
        className="all-regions"
        onClick={() =>
          choose({ type: "all", code: "all", name: "All regions" })
        }
      >
        <span className="world-icon">◎</span>
        <span>
          <strong>The whole world, one place</strong>
          <small>
            Explore all {data.channels.length.toLocaleString()} public channels
          </small>
        </span>
        <span className="arrow">↗</span>
      </button>
      <div className="country-grid">
        {filtered.slice(0, limit).map((c, i) => (
          <motion.button
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduced ? 0 : Math.min(i, 12) * 0.025,
              duration: reduced ? 0 : 0.25,
            }}
            className="country-card"
            key={c.code}
            onClick={() => choose({ type: c.type, code: c.code, name: c.name })}
          >
            <span className="country-flag" aria-hidden="true">
              {c.icon}
            </span>
            {c.type === "country" && c.code === locale && (
              <span className="suggested">FOR YOU</span>
            )}
            <strong>{c.name}</strong>
            <small>
              {c.count.toLocaleString()} channels <span>↗</span>
            </small>
          </motion.button>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          No matches. Try another {tab === "countries" ? "country" : "name"}.
        </p>
      )}
      {filtered.length > limit && (
        <button
          className="secondary-button show-more"
          onClick={() => setLimit((n) => n + 24)}
        >
          Show more {tab}
        </button>
      )}
    </>
  );
}
