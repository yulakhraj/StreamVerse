import { beforeEach, expect, it } from "vitest";
import { usePreferences } from "./preferences";
beforeEach(() =>
  usePreferences.setState({
    favorites: [],
    recents: [],
    hidden: [],
    lastRegion: null,
  }),
);
it("toggles favorites and deduplicates recent playback", () => {
  const p = usePreferences.getState();
  p.toggleFavorite("a");
  expect(usePreferences.getState().favorites).toEqual(["a"]);
  p.toggleFavorite("a");
  expect(usePreferences.getState().favorites).toEqual([]);
  p.record("a");
  p.record("b");
  p.record("a");
  expect(usePreferences.getState().recents).toEqual(["a", "b"]);
});
it("bounds history and restores hidden channels", () => {
  const p = usePreferences.getState();
  for (let i = 0; i < 40; i++) p.record(String(i));
  expect(usePreferences.getState().recents).toHaveLength(30);
  p.hide("a");
  p.hide("a");
  expect(usePreferences.getState().hidden).toEqual(["a"]);
  p.restore();
  expect(usePreferences.getState().hidden).toEqual([]);
});
