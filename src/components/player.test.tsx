// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";
import Player from "./Player";
import type { Channel } from "../lib/catalog";
const channel: Channel = {
  id: "fixture",
  name: "Test News",
  country: "XX",
  countryName: "Testland",
  categories: [],
  categoryNames: [],
  languages: [],
  streams: [
    "https://example.com/first.m3u8",
    "https://example.com/second.m3u8",
  ],
};
beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi
    .fn()
    .mockReturnValue({
      matches: true,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
    "probably",
  );
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("retries a failing native stream, uses the proxy and advances to the next source", async () => {
  render(
    <Player
      channel={channel}
      channels={[channel]}
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
  const video = screen.getByLabelText(
    "Test News live video",
  ) as HTMLVideoElement;
  expect(video.getAttribute("src")).toBe(channel.streams[0]);
  fireEvent.error(video);
  expect(video.getAttribute("src")).toBe(channel.streams[0]);
  fireEvent.error(video);
  expect(video.getAttribute("src")).toContain("/api/stream?url=");
  fireEvent.error(video);
  expect(video.getAttribute("src")).toBe(channel.streams[1]);
  fireEvent.error(video);
  fireEvent.error(video);
  fireEvent.error(video);
  expect(screen.getByText("Off the air. For now.")).toBeTruthy();
  await act(async () => {});
});
it("records only successful playback and clears its watchdog on playback", async () => {
  const played = vi.fn();
  render(
    <Player
      channel={channel}
      channels={[channel]}
      onClose={() => {}}
      onSelect={() => {}}
      onPlaying={played}
    />,
  );
  expect(played).not.toHaveBeenCalled();
  const video = screen.getByLabelText("Test News live video");
  fireEvent.playing(video);
  expect(played).toHaveBeenCalledWith(channel);
  await act(async () => {
    vi.advanceTimersByTime(21000);
  });
  expect(video.getAttribute("src")).toBe(channel.streams[0]);
  expect(screen.queryByText("Off the air. For now.")).toBeNull();
});
