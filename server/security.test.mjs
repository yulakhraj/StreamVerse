import { expect, it } from "vitest";
import {
  publicAddress,
  safeUrl,
  sign,
  verify,
  rewritePlaylist,
} from "./security.mjs";
it("rejects private, metadata, mapped and loopback destinations", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "192.168.1.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "100.64.0.1",
  ])
    expect(publicAddress(ip)).toBe(false);
  expect(publicAddress("8.8.8.8")).toBe(true);
  for (const url of [
    "http://localhost/a",
    "file:///etc/passwd",
    "https://a:b@example.com",
    "http://example.com:8080",
  ])
    expect(() => safeUrl(url)).toThrow();
});
it("binds expiring signatures to the exact resource", () => {
  const url = "https://example.com/a",
    expires = 100000;
  const sig = sign("secret", url, expires);
  expect(verify("secret", url, expires, sig, 90000)).toBe(true);
  expect(verify("secret", url + "b", expires, sig, 90000)).toBe(false);
  expect(verify("secret", url, expires, sig, 100001)).toBe(false);
});
it("rewrites variant, segment, map and encryption key references", () => {
  const result = rewritePlaylist(
    '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXT-X-MAP:URI="init.mp4"\nnext.m3u8\nseg.ts',
    "https://example.com/live/master.m3u8",
    (url) => `proxy:${url}`,
  );
  expect(result).toContain('URI="proxy:https://example.com/live/key"');
  expect(result).toContain('URI="proxy:https://example.com/live/init.mp4"');
  expect(result).toContain("proxy:https://example.com/live/next.m3u8");
  expect(result).toContain("proxy:https://example.com/live/seg.ts");
  expect(() =>
    rewritePlaylist(
      "#EXTM3U\nhttp://127.0.0.1/x",
      "https://example.com",
      (x) => x,
    ),
  ).toThrow();
});
