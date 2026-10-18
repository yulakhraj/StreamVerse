import { expect, it } from "vitest";
import { createSearch } from "./search";
import type { Channel } from "./catalog";
const channel: Channel = {
  id: "fixture",
  name: "Example News",
  country: "XX",
  countryName: "Exampleland",
  categories: ["news"],
  categoryNames: ["News"],
  languages: [],
  streams: [],
};
it("finds channels by typo, country and category", () => {
  const search = createSearch([channel]);
  for (const q of ["Exmple", "Exampleland", "News"])
    expect(search.search(q)[0]?.item.id).toBe("fixture");
  expect(search.search("zzzzzz")).toHaveLength(0);
});
