import { useEffect, useMemo, useRef, useState } from "react";
import type { Channel } from "../lib/catalog";
import { createSearch } from "../lib/search";
export default function SearchPalette({
  channels,
  onClose,
  onSelect,
}: {
  channels: Channel[];
  onClose: () => void;
  onSelect: (channel: Channel) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const index = useMemo(() => createSearch(channels), [channels]);
  const results = useMemo(
    () =>
      query.trim()
        ? index.search(query.trim(), { limit: 30 }).map((r) => r.item)
        : channels.slice(0, 12),
    [index, query, channels],
  );
  useEffect(() => {
    dialog.current?.showModal();
    input.current?.focus();
  }, []);
  useEffect(() => {
    document
      .getElementById(`search-result-${active}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  return (
    <dialog
      className="search-dialog"
      ref={dialog}
      aria-label="Search live channels"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="palette-inner">
        <div className="palette-input">
          <span aria-hidden="true">⌕</span>
          <input
            ref={input}
            value={query}
            placeholder="Search channels, countries, categories…"
            aria-label="Search channels"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={
              results.length ? `search-result-${active}` : undefined
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((n) =>
                  results.length
                    ? (n + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                      results.length
                    : 0,
                );
              }
              if (e.key === "Enter" && results[active]) {
                onSelect(results[active]);
                onClose();
              }
            }}
          />
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="palette-caption">
          {query ? "CHANNEL RESULTS" : "EXPLORE LIVE CHANNELS"}
        </p>
        <div
          id="search-results"
          role="listbox"
          aria-label="Matching channels"
          className="search-results"
        >
          {results.map((c, i) => (
            <button
              role="option"
              aria-selected={i === active}
              id={`search-result-${i}`}
              key={c.id}
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onSelect(c);
                onClose();
              }}
            >
              <span className="switcher-logo">
                {c.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.countryName} · {c.categoryNames[0] ?? "General"}
                </small>
              </span>
              <span className="search-enter" aria-hidden="true">
                ↵
              </span>
            </button>
          ))}
        </div>
        {!results.length && (
          <p className="empty-state">
            No channels found. Try a country or a shorter name.
          </p>
        )}
        <div className="palette-footer">
          <span>↑ ↓ to navigate</span>
          <span>↵ to watch</span>
          <span>esc to close</span>
        </div>
      </div>
    </dialog>
  );
}
