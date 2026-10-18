import Fuse from "fuse.js";
import type { Channel } from "./catalog";
export function createSearch(channels: Channel[]) {
  return new Fuse(channels, {
    keys: [
      { name: "name", weight: 3 },
      { name: "countryName", weight: 1 },
      { name: "categoryNames", weight: 1 },
    ],
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
}
