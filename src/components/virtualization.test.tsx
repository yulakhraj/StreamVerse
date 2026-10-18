// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import VirtualChannelGrid from "./VirtualChannelGrid";
import type { Channel } from "../lib/catalog";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("keeps a 10,000-channel list bounded in the DOM", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  const channels: Channel[] = Array.from({ length: 10000 }, (_, i) => ({
    id: String(i),
    name: `Fixture ${i}`,
    country: "XX",
    countryName: "Testland",
    categories: [],
    categoryNames: [],
    languages: [],
    streams: [],
  }));
  render(<VirtualChannelGrid channels={channels} onPlay={() => {}} />);
  const cards = screen.getAllByRole("listitem");
  expect(cards.length).toBeGreaterThan(0);
  expect(cards.length).toBeLessThan(60);
  expect(cards[0].getAttribute("aria-setsize")).toBe("10000");
});
