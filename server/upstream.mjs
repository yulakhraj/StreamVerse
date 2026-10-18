import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { safeUrl, publicAddress } from "./security.mjs";
export async function openUpstream(value, range, depth = 0) {
  if (depth > 4) throw new Error("Too many upstream redirects.");
  const url = safeUrl(value);
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("Private network destination blocked.");
  const selected = addresses[0];
  const response = await new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).request(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "StreamVerse/1.0",
          "Accept-Encoding": "identity",
          ...(range ? { Range: range } : {}),
        },
        // Pin the checked DNS result for this request to prevent DNS rebinding.
        lookup: (_host, options, callback) =>
          options.all
            ? callback(null, [selected])
            : callback(null, selected.address, selected.family),
      },
      resolve,
    );
    req.setTimeout(20000, () =>
      req.destroy(new Error("Upstream request timed out.")),
    );
    req.on("error", reject);
    req.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    const location = response.headers.location;
    response.destroy();
    if (!location) throw new Error("Missing redirect location.");
    return openUpstream(new URL(location, url).href, range, depth + 1);
  }
  return { response, url: url.href };
}
export async function readLimited(response, max = 4 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response) {
    size += chunk.length;
    if (size > max) {
      response.destroy();
      throw new Error("Upstream response exceeded size limit.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
