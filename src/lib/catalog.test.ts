import { describe, expect, it } from "vitest";
import {
  cacheFresh,
  CACHE_TTL,
  normalize,
  publicUrl,
  type Sources,
} from "./catalog";
// Synthetic metadata only for unit tests; never shipped as a channel catalog.
const fixture: Sources = {
  channels: [
    { id: "test", name: "Test channel", country: "XX" },
    { id: "closed", name: "Closed", country: "XX", closed: "2020-01-01" },
  ],
  streams: [
    { channel: "test", url: "https://example.com/live.m3u8" },
    { channel: "test", url: "https://example.com/live.m3u8" },
    { channel: "test", url: "https://user:pass@example.com/private" },
    { channel: "closed", url: "https://example.com/closed" },
  ],
  countries: [{ code: "XX", name: "Test country" }],
  categories: [],
  regions: [],
  languages: [],
  logos: [],
};
describe("catalog normalization", () => {
  it("joins country metadata, deduplicates public streams and excludes closed channels", () => {
    const result = normalize(fixture).channels;
    expect(result).toHaveLength(1);
    expect(result[0].countryName).toBe("Test country");
    expect(result[0].streams).toEqual(["https://example.com/live.m3u8"]);
  });
  it("excludes header-dependent streams", () =>
    expect(
      normalize({
        ...fixture,
        streams: [
          {
            channel: "test",
            url: "https://example.com/live",
            http_referrer: "https://example.com",
          },
        ],
      }).channels,
    ).toHaveLength(0));
  it("rejects non-web and credential-bearing URLs", () => {
    expect(publicUrl("javascript:alert(1)")).toBe(false);
    expect(publicUrl("https://user:pass@example.com")).toBe(false);
  });
  it("expires cached data and rejects future timestamps", () => {
    expect(cacheFresh(100, 101)).toBe(true);
    expect(cacheFresh(100, 100 + CACHE_TTL)).toBe(false);
    expect(cacheFresh(101, 100)).toBe(false);
  });
});

it("joins feed language metadata when channel records omit languages", () => {
  const data = normalize({
    ...fixture,
    feeds: [{ channel: "test", id: "main", languages: ["eng", "eng"] }],
  });
  expect(data.channels[0].languages).toEqual(["eng"]);
});
