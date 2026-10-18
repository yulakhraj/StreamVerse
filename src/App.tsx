import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import ChannelBrowser from "./components/ChannelBrowser";
import type { Channel } from "./lib/catalog";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import { usePreferences } from "./lib/preferences";
import Hero from "./components/Hero";
import RegionPicker from "./components/RegionPicker";
import { useCatalog } from "./lib/useCatalog";
import { useStore } from "./lib/store";
import "./App.css";
const SearchPalette = lazy(() => import("./components/SearchPalette"));
const Player = lazy(() => import("./components/Player"));
function App() {
  const reduced = useReducedMotion();
  const { data: catalog, loading, error, stale, refresh } = useCatalog();
  const hidden = usePreferences((s) => s.hidden),
    restore = usePreferences((s) => s.restore),
    record = usePreferences((s) => s.record);
  const data = useMemo(
    () =>
      catalog
        ? {
            ...catalog,
            channels: catalog.channels.filter((c) => !hidden.includes(c.id)),
          }
        : undefined,
    [catalog, hidden],
  );
  const { selection, choose } = useStore();
  const [active, setActive] = useState<Channel | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <button
            className="brand"
            onClick={() => choose(null)}
            aria-label="StreamVerse home"
          >
            <span className="brand-mark" aria-hidden="true">
              ▷
            </span>
            Stream<span>Verse</span>
            <span className="beta">BETA</span>
          </button>
          <button
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Search channels (Control or Command K)"
          >
            <span>⌕</span>{" "}
            <span className="search-trigger-text">Search channels</span>
            <kbd>⌘ K</kbd>
          </button>
        </header>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            aria-current={!selection ? "page" : undefined}
            onClick={() => choose(null)}
          >
            ◎ Discover
          </button>
          <button
            aria-current={selection?.type === "favorites" ? "page" : undefined}
            onClick={() =>
              choose({
                type: "favorites",
                code: "favorites",
                name: "Your favorites",
              })
            }
          >
            ♡ Favorites
          </button>
          <button
            aria-current={selection?.type === "recents" ? "page" : undefined}
            onClick={() =>
              choose({
                type: "recents",
                code: "recents",
                name: "Recently watched",
              })
            }
          >
            ↶ Recently watched
          </button>
        </nav>
        <main id="main">
          {!selection && <Hero />}
          <section
            id="regions"
            className="regions"
            aria-labelledby="regions-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow muted">FIND YOUR FREQUENCY</p>
                <h2 id="regions-title">
                  {selection?.name ?? "Where will you watch?"}
                </h2>
              </div>
              <span className="section-note">
                A window into every time zone
              </span>
            </div>
            {hidden.length > 0 && (
              <div className="notice">
                {hidden.length} hidden channels.{" "}
                <button onClick={restore}>Restore all</button>
              </div>
            )}
            {stale && (
              <div className="notice" role="status">
                Using your saved catalog while the source is unavailable.{" "}
                <button onClick={() => void refresh(true)}>Try refresh</button>
              </div>
            )}
            {error && (
              <div className="empty-state" role="alert">
                <h3>A little quiet on the airwaves.</h3>
                <p>{error}</p>
                <button
                  className="primary-button"
                  onClick={() => void refresh(true)}
                >
                  Try again ↗
                </button>
              </div>
            )}
            {loading && !data && (
              <div role="status" aria-label="Loading public channel catalog">
                <p className="loading-label">
                  Connecting to the public channel catalog…
                </p>
                <div className="region-placeholders" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div className="placeholder-card" key={i}>
                      <span className="placeholder-icon" />
                      <span className="placeholder-line" />
                      <span className="placeholder-line short" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data && (
              <motion.div
                key={selection ? `${selection.type}:${selection.code}` : "home"}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
              >
                {selection ? (
                  <ChannelBrowser
                    key={`${selection.type}:${selection.code}`}
                    data={data}
                    selection={selection}
                    onPlay={setActive}
                  />
                ) : (
                  <RegionPicker data={data} />
                )}
              </motion.div>
            )}
          </section>
        </main>
        <footer>
          <button className="footer-brand" onClick={() => choose(null)}>
            ▷ StreamVerse
          </button>
          <p>Made for a world that never stops watching.</p>
          <a
            href="https://github.com/iptv-org/iptv"
            target="_blank"
            rel="noreferrer"
          >
            Open IPTV sources ↗
          </a>
        </footer>
        {searchOpen && (
          <Suspense
            fallback={
              <div className="notice" role="status">
                Opening search…
              </div>
            }
          >
            <SearchPalette
              channels={data?.channels ?? []}
              onClose={() => setSearchOpen(false)}
              onSelect={setActive}
            />
          </Suspense>
        )}
        {data && (
          <AnimatePresence>
            {active && (
              <Suspense
                fallback={
                  <div className="player-backdrop">
                    <p role="status">Loading player…</p>
                  </div>
                }
              >
                <Player
                  channel={active}
                  channels={data.channels}
                  onClose={() => setActive(null)}
                  onSelect={setActive}
                  onPlaying={(c) => record(c.id)}
                />
              </Suspense>
            )}
          </AnimatePresence>
        )}
      </div>
    </MotionConfig>
  );
}
export default App;
