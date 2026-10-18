import { expect, it } from "vitest";
import { filterChannels, scopeChannels } from "./filter";
import type { Catalog, Channel } from "./catalog";
const a: Channel = {
  id: "a",
  name: "A",
  country: "XX",
  countryName: "Example",
  categories: ["news"],
  categoryNames: ["News"],
  languages: ["eng"],
  streams: [],
};
const b: Channel = {
  ...a,
  id: "b",
  country: "YY",
  categories: ["music"],
  languages: ["fra"],
};
const data: Catalog = {
  channels: [a, b],
  countries: [],
  regions: [{ code: "test", name: "Test", countries: ["YY"] }],
  categories: [],
  languages: [],
};
it("intersects filters rather than broadening results", () => {
  expect(filterChannels(data.channels, "XX", "news", "eng")).toEqual([a]);
  expect(filterChannels(data.channels, "XX", "music", "")).toEqual([]);
});
it("scopes regions by their real country membership", () => {
  expect(
    scopeChannels(data, { type: "region", code: "test", name: "Test" }),
  ).toEqual([b]);
});
