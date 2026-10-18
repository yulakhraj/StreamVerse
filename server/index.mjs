import express from "express";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { openUpstream, readLimited } from "./upstream.mjs";
import { safeUrl, sign, verify, rewritePlaylist } from "./security.mjs";
// Function instances must share a key; a process-local key is only safe locally.
const secret =
  process.env.STREAM_PROXY_SECRET ||
  (process.env.VERCEL ? null : randomBytes(32));
let allowed = new Set(),
  catalogExpires = 0,
  catalogRequest;
async function loadAllowed() {
  if (Date.now() < catalogExpires) return allowed;
  if (catalogRequest) return catalogRequest;
  catalogRequest = (async () => {
    const json = async (name) => {
      const { response } = await openUpstream(
        `https://iptv-org.github.io/api/${name}.json`,
      );
      if (response.statusCode !== 200) {
        response.destroy();
        throw new Error("Public catalog unavailable.");
      }
      return JSON.parse(await readLimited(response, 32 * 1024 * 1024));
    };
    const [streams, channels] = await Promise.all([
      json("streams"),
      json("channels"),
    ]);
    const channelIds = new Set(
      channels.filter((c) => !c.closed && !c.is_nsfw).map((c) => c.id),
    );
    const next = new Set();
    for (const s of streams)
      if (channelIds.has(s.channel) && !s.http_referrer && !s.user_agent) {
        try {
          next.add(safeUrl(s.url).href);
        } catch {
          /* Unsupported public endpoint. */
        }
      }
    allowed = next;
    catalogExpires = Date.now() + 6 * 60 * 60 * 1000;
    return allowed;
  })().finally(() => {
    catalogRequest = undefined;
  });
  return catalogRequest;
}
export const app = express();
app.disable("x-powered-by");
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/stream", async (req, res) => {
  let upstream;
  if (!secret) {
    res
      .status(503)
      .json({ error: "The stream fallback has not been configured." });
    return;
  }
  try {
    if (typeof req.query.url !== "string") {
      res.status(400).json({ error: "A catalog stream URL is required." });
      return;
    }
    const url = safeUrl(req.query.url).href;
    const expires = String(req.query.expires ?? ""),
      signature = String(req.query.signature ?? "");
    if (
      !verify(secret, url, expires, signature) &&
      !(await loadAllowed()).has(url)
    ) {
      res
        .status(403)
        .json({ error: "This URL is not an eligible public catalog stream." });
      return;
    }
    const range =
      typeof req.headers.range === "string" &&
      /^bytes=\d+-\d*$/.test(req.headers.range)
        ? req.headers.range
        : undefined;
    const opened = await openUpstream(url, range);
    upstream = opened.response;
    res.on("close", () => upstream?.destroy());
    if (![200, 206].includes(upstream.statusCode)) {
      upstream.destroy();
      res.status(502).json({ error: "The public broadcaster is unavailable." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const contentType = upstream.headers["content-type"] ?? "";
    if (/(?:text\/html|javascript|svg\+xml)/i.test(contentType))
      throw new Error("Non-media response blocked.");
    if (/mpegurl/i.test(contentType) || /\.m3u8(?:\?|$)/i.test(opened.url)) {
      if (
        upstream.headers["content-encoding"] &&
        upstream.headers["content-encoding"] !== "identity"
      )
        throw new Error("Compressed playlist not supported.");
      const playlist = await readLimited(upstream);
      const rewritten = rewritePlaylist(playlist, opened.url, (child) => {
        const expires = Date.now() + 10 * 60 * 1000;
        return `/api/stream?url=${encodeURIComponent(child)}&expires=${expires}&signature=${sign(secret, child, expires)}`;
      });
      res.type("application/vnd.apple.mpegurl").send(rewritten);
    } else {
      res.status(upstream.statusCode);
      for (const header of [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "content-encoding",
      ])
        if (upstream.headers[header])
          res.setHeader(header, upstream.headers[header]);
      let total = 0;
      const cap = new Transform({
        transform(chunk, _encoding, callback) {
          total += chunk.length;
          callback(
            total > 64 * 1024 * 1024 ? new Error("Segment too large.") : null,
            chunk,
          );
        },
      });
      await pipeline(upstream, cap, res);
    }
  } catch {
    upstream?.destroy();
    if (!res.headersSent)
      res.status(502).json({
        error: "The stream fallback is unavailable. Try another channel.",
      });
    else res.destroy();
  }
});
app.use(
  express.static(resolve(fileURLToPath(new URL("../dist", import.meta.url))), {
    index: "index.html",
  }),
);
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  app.listen(
    Number(process.env.PORT ?? 8787),
    process.env.HOST ?? "127.0.0.1",
    () =>
      console.log(
        `StreamVerse server: http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT ?? 8787}`,
      ),
  );
