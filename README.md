# StreamVerse

A cinematic, region-first browser for open, public IPTV. Built with React, Vite, strict TypeScript, Tailwind CSS, Framer Motion, GSAP, hls.js, Fuse.js, Zustand and a small Express fallback proxy.

## Run locally

Use Node.js 24 (see `.nvmrc`) and npm.

```sh
npm ci
npm run proxy
```

In a second terminal:

```sh
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. Vite forwards `/api` to the proxy on `127.0.0.1:8787`. Both processes are needed to exercise fallback playback; direct HTTPS streams can work without the proxy.

For a single production process:

```sh
npm run build
npm start
```

Open `http://localhost:8787`. The server serves `dist/` and `/api/stream`. Set `PORT` and `HOST` to change its listener; for a container, use `HOST=0.0.0.0`. Put it behind your HTTPS reverse proxy for public hosting. Keep the frontend and fallback endpoint on the same origin. Vercel deployment configuration is included; see below.

`VITE_STREAM_PROXY` defaults to `/api/stream`. Copy `.env.example` to `.env.local` to customize it. An empty value disables fallback. Vite variables are read at build time. `npm run preview` previews only the static build; use `npm start` to test the production proxy.

## Deploy on Vercel

Import this GitHub repository into Vercel using the Vite preset and Node.js 24. `vercel.json` builds `dist/` and deploys `/api/stream` and `/api/health` as Node functions. The frontend and fallback use the same origin.

Configure `STREAM_PROXY_SECRET` as an encrypted, server-only environment variable in Production and Preview. Use a randomly generated 32-byte value and keep it stable across function instances. It is never embedded in the frontend. Without this setting, the proxy returns 503; direct playback remains available. Rotating it invalidates existing signed playlist URLs until playback reconnects. Local development uses a temporary key when the variable is absent.

The proxy streams media responses and has a 60-second per-request duration limit on Vercel. It is a fallback; broadcaster traffic and function usage still count toward hosting limits.

## Use the app

- Launch lands on the region picker. Choose a country, region, category, or all regions. Browser locale suggests a country; a shortcut remembers your last selection.
- Filter by country, category and known language metadata. Countries with no eligible streams are omitted. Counts refer to catalog entries, not verified online streams.
- Open global fuzzy search with **Ctrl/Cmd+K**. Use **↑/↓**, **Enter** and **Escape** in the palette.
- Click a channel to play. Native video controls provide play/pause, volume and seeking where available; the player adds fullscreen, picture-in-picture where supported, and quality selection for hls.js. Native Safari HLS manages quality automatically.
- **↑/↓** switches channels when focus is outside video/form controls. **Escape** closes the player. Native video keyboard controls remain available when the video has focus.
- Favorite channels with the heart. Recently watched records successful playback only. An offline channel can be hidden; use **Restore all** to undo hidden channels.
- Motion follows the operating system's reduced-motion preference. Preferences are local to this browser; no accounts or analytics are used.

## Data and caching

Runtime data comes from the [iptv-org JSON API](https://iptv-org.github.io/api/): `channels.json`, `streams.json`, `countries.json`, `regions.json`, `categories.json`, `languages.json`, `logos.json`, and feed language metadata from `feeds.json` when available. The app uses the structured API; it does not ship a hard-coded catalog. The project's [M3U playlists](https://iptv-org.github.io/iptv/) and [source repository](https://github.com/iptv-org/iptv) are the associated public sources.

Channel/stream records are joined by channel ID; duplicate URLs are removed. Closed and adult channels, credential-bearing URLs, and streams requiring custom referrer/user-agent headers are excluded. HTTPS sources are tried first. Language availability reflects metadata, and does not guarantee that every fallback feed uses that language. Missing logos get a text monogram.

Normalized responses are cached in IndexedDB for six hours. An expired cache can be used after a failed refresh, with a visible stale-data notice. Storage failures fall back to memory. Favorites, the latest 30 successful channels, hidden IDs and last region use versioned localStorage. Clear the site's browser storage to reset everything.

## Playback and fallback

Safari/native HLS is preferred when available; otherwise hls.js loads on demand. For each source the player tries direct playback, one direct retry, and then the proxy before moving to the next URL. HTTP sources on HTTPS pages go directly to the fallback to avoid mixed content. Each connection has a 20-second watchdog; HLS also has bounded internal retries. Browser autoplay restrictions prompt the user to press play.

The proxy only accepts entry URLs from eligible public catalog streams. It rewrites HLS playlists, segments and key references into expiring signed URLs. Every upstream destination and redirect is checked against private/reserved addresses; the DNS result is pinned for the connection. Cookies, authorization and source-specific authentication headers are not forwarded. It enforces request timeouts and response-size limits and rejects DRM-style SAMPLE-AES playlists. `/api/health` provides a local health check.

The proxy needs outbound DNS and HTTP(S) access to iptv-org and the public broadcasters/CDNs. It cannot recover dead streams, add codec support, bypass geoblocking or bypass payment/authentication. Restarting the proxy invalidates existing signed child URLs; reopen playback after a restart. The included proxy targets HLS; continuous non-HLS responses are bounded to 64 MiB.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tests cover normalization, cache expiry, filtering, fuzzy search, preferences, keyboard selection, native-player retry/fallback, successful-playback recording, bounded virtualization, URL validation, playlist rewriting and signature expiry/tampering. Test-only fixtures use `example.com` and synthetic names; none are available in the app.

The grid virtualizes lists above 48 channels. Logos load lazily. Search, GSAP, the player and hls.js are separate chunks; native HLS does not download hls.js. The initial JS is approximately 131 kB gzip. The full, deferred HLS engine is approximately 179 kB gzip; its >500 kB uncompressed Vite warning is expected.

**Still requiring a real browser and live network:** 375px and 1440px visual checks, browser console inspection, smoothness/reduced-motion inspection, Lighthouse performance ≥85, region-to-grid timing below two seconds, and successful playback of at least five channels spanning three regions. The development environment denied access to `iptv-org.github.io` and supplied no browser-control tool. The user approved continuing with code/build tests. These checks are explicitly unverified; see `PROGRESS.md`.

For playback verification, select channels from the fetched catalog, play each for at least 30 seconds, and record channel ID, country, time, source URL, video progress and any fallback used. Do not count a successful manifest fetch as successful video playback.

## Source layout

- `src/components/`: picker, channel browser, virtualized grid, search palette, player and hero.
- `src/lib/`: catalog/cache, search/filter functions, preferences and UI state.
- `server/`: Express fallback, upstream HTTP handling and URL/playlist security.
- `PROGRESS.md`: iteration history, verified checks and remaining exit criteria.

## Legal and source availability

StreamVerse indexes publicly listed streams from iptv-org and does not host, sell or claim ownership of broadcaster content. No paid services, private playlists, credentials or access-control bypasses are added. A public listing is not proof of redistribution rights; availability and permissions can vary by broadcaster and jurisdiction. Use only streams you are authorized to watch. Report questionable entries to the upstream project and respect broadcaster restrictions and takedown requests.
