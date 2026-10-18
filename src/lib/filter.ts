import type { Catalog, Channel } from "./catalog";
import type { Selection } from "./store";
export function scopeChannels(data: Catalog, selection: Selection): Channel[] {
  if (selection.type === "country")
    return data.channels.filter((c) => c.country === selection.code);
  if (selection.type === "category")
    return data.channels.filter((c) => c.categories.includes(selection.code));
  if (selection.type === "region") {
    const codes = new Set(
      data.regions.find((r) => r.code === selection.code)?.countries ?? [],
    );
    return data.channels.filter((c) => codes.has(c.country));
  }
  return data.channels;
}
export function filterChannels(
  channels: Channel[],
  country: string,
  category: string,
  language: string,
) {
  return channels.filter(
    (c) =>
      (!country || c.country === country) &&
      (!category || c.categories.includes(category)) &&
      (!language || c.languages.includes(language)),
  );
}
