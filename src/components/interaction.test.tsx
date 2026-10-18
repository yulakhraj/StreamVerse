// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "framer-motion";
import RegionPicker from "./RegionPicker";
import ChannelBrowser from "./ChannelBrowser";
import SearchPalette from "./SearchPalette";
import { useStore } from "../lib/store";
import { usePreferences } from "../lib/preferences";
import type { Catalog, Channel } from "../lib/catalog";
const channel: Channel = {
  id: "fixture",
  name: "Test News",
  country: "XX",
  countryName: "Testland",
  categories: ["news"],
  categoryNames: ["News"],
  languages: ["eng"],
  streams: [],
};
const data: Catalog = {
  channels: [channel],
  countries: [{ code: "XX", name: "Testland" }],
  regions: [],
  categories: [
    { id: "news", name: "News" },
    { id: "music", name: "Music" },
  ],
  languages: [{ code: "eng", name: "English" }],
};
beforeAll(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({
      matches: true,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
});
beforeEach(() => {
  useStore.setState({ selection: null });
  usePreferences.setState({
    favorites: [],
    recents: [],
    hidden: [],
    lastRegion: null,
  });
});
afterEach(cleanup);
it("chooses a country and remembers it without navigating automatically on launch", async () => {
  render(
    <MotionConfig reducedMotion="always">
      <RegionPicker data={data} />
    </MotionConfig>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Testland/ }));
  expect(useStore.getState().selection?.code).toBe("XX");
  expect(usePreferences.getState().lastRegion?.code).toBe("XX");
});
it("filters channels and toggles favorites without starting playback", async () => {
  const play = vi.fn();
  render(
    <ChannelBrowser
      data={data}
      selection={{ type: "all", code: "all", name: "All" }}
      onPlay={play}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /Add Test News/ }));
  expect(usePreferences.getState().favorites).toEqual(["fixture"]);
  expect(play).not.toHaveBeenCalled();
  await userEvent.selectOptions(screen.getByLabelText("Category"), "music");
  expect(screen.getByText("No channels in this view.")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Watch Test News" }),
  );
  expect(play).toHaveBeenCalledWith(channel);
});
it("opens search with focus and plays a keyboard-selected fuzzy result", async () => {
  const close = vi.fn(),
    select = vi.fn();
  render(
    <SearchPalette
      channels={data.channels}
      onClose={close}
      onSelect={select}
    />,
  );
  const input = screen.getByRole("combobox");
  expect(document.activeElement).toBe(input);
  await userEvent.type(input, "Tst News");
  expect(screen.getByRole("option").textContent).toContain("Test News");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(select).toHaveBeenCalledWith(channel);
  expect(close).toHaveBeenCalled();
});
