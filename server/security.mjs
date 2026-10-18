import { createHmac, timingSafeEqual } from "node:crypto";
import ipaddr from "ipaddr.js";
export function safeUrl(value) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !["", "80", "443"].includes(url.port)
  )
    throw new Error(
      "Only public HTTP(S) streams on standard ports are supported.",
    );
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    (!hostname.includes(".") && !ipaddr.isValid(hostname))
  )
    throw new Error("Private hosts are not supported.");
  if (ipaddr.isValid(hostname) && !publicAddress(hostname))
    throw new Error("Private addresses are not supported.");
  return url;
}
export function publicAddress(address) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && ip.isIPv4MappedAddress())
      ip = ip.toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function sign(secret, url, expires) {
  return createHmac("sha256", secret)
    .update(`${expires}\n${url}`)
    .digest("hex");
}
export function verify(secret, url, expires, signature, now = Date.now()) {
  if (
    !/^\d+$/.test(String(expires)) ||
    Number(expires) < now ||
    Number(expires) > now + 15 * 60 * 1000 ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return false;
  return timingSafeEqual(
    Buffer.from(sign(secret, url, expires), "hex"),
    Buffer.from(signature, "hex"),
  );
}
export function rewritePlaylist(text, base, makeUrl) {
  if (!text.trimStart().startsWith("#EXTM3U"))
    throw new Error("Invalid HLS playlist.");
  if (/METHOD=(SAMPLE-AES|SAMPLE-AES-CTR)/.test(text))
    throw new Error("Protected streams are not supported.");
  const rewrite = (relative) =>
    makeUrl(safeUrl(new URL(relative, base).href).href);
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      if (line.startsWith("#"))
        return line.replace(
          /URI="([^"]+)"/g,
          (_match, uri) => `URI="${rewrite(uri)}"`,
        );
      return rewrite(line.trim());
    })
    .join("\n");
}
