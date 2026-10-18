import { expect, it } from "vitest";
import { playbackAttempts } from "./playback";
it("retries then tries proxy then advances to the next source", () => {
  const a = playbackAttempts(
    ["https://example.com/a", "https://example.com/b"],
    true,
    "/api/stream",
  );
  expect(a.map((x) => [x.proxied, x.retry])).toEqual([
    [false, false],
    [false, true],
    [true, false],
    [false, false],
    [false, true],
    [true, false],
  ]);
  expect(a[3].url).toBe("https://example.com/b");
});
it("never loads mixed content directly on a secure page", () =>
  expect(
    playbackAttempts(["http://example.com/live"], true, "/api/stream"),
  ).toEqual([
    {
      url: "/api/stream?url=http%3A%2F%2Fexample.com%2Flive",
      proxied: true,
      retry: false,
    },
  ]));
