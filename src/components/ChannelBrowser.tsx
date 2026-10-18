import { useMemo, useState } from "react";
import type { Catalog, Channel } from "../lib/catalog";
import { usePreferences } from "../lib/preferences";
import { useStore, type Selection } from "../lib/store";
import { filterChannels, scopeChannels } from "../lib/filter";
import VirtualChannelGrid from "./VirtualChannelGrid";
import ChannelCard from "./ChannelCard";
export default function ChannelBrowser({
  data,
  selection,
  onPlay,
}: {
  data: Catalog;
  selection: Selection;
  onPlay: (channel: Channel) => void;
}) {
  const favorites = usePreferences((s) => s.favorites),
    recents = usePreferences((s) => s.recents);
  const choose = useStore((s) => s.choose);
  const [country, setCountry] = useState(""),
    [category, setCategory] = useState(""),
    [language, setLanguage] = useState("");
  const scoped = useMemo(
    () =>
      selection.type === "favorites"
        ? data.channels.filter((c) => favorites.includes(c.id))
        : selection.type === "recents"
          ? recents.flatMap(
              (id) => data.channels.find((c) => c.id === id) ?? [],
            )
          : scopeChannels(data, selection),
    [data, selection, favorites, recents],
  );
  const filtered = useMemo(
    () => filterChannels(scoped, country, category, language),
    [scoped, country, category, language],
  );
  const countries = useMemo(
    () => new Set(scoped.map((c) => c.country)),
    [scoped],
  );
  const languages = useMemo(
    () => new Set(scoped.flatMap((c) => c.languages)),
    [scoped],
  );
  return (
    <>
      <button className="back-button" onClick={() => choose(null)}>
        ← Explore regions
      </button>
      <div className="filter-row">
        <label>
          Country
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
            }}
          >
            <option value="">All countries</option>
            {data.countries
              .filter((c) => countries.has(c.code))
              .map((c) => (
                <option value={c.code} key={c.code}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
          >
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Language
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
            }}
          >
            <option value="">All languages</option>
            {data.languages
              .filter((l) => languages.has(l.code))
              .map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
          </select>
        </label>
        <span className="result-count" role="status">
          {filtered.length.toLocaleString()} channels
        </span>
      </div>
      <div className="catalog-grid">
        {filtered.length > 48 ? (
          <VirtualChannelGrid
            key={`${country}:${category}:${language}`}
            channels={filtered}
            onPlay={onPlay}
          />
        ) : (
          <div className="channel-grid" role="list">
            {filtered.map((c, i) => (
              <ChannelCard
                key={c.id}
                channel={c}
                onPlay={onPlay}
                position={i + 1}
                total={filtered.length}
              />
            ))}
          </div>
        )}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <h3>No channels in this view.</h3>
          <p>Try another category, country, or language.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setCountry("");
              setCategory("");
              setLanguage("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
