// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";
import { usePreferences } from "../lib/preferences";
let systemDark = true;
let onChange: () => void = () => {};
beforeEach(() => {
  localStorage.clear();
  usePreferences.setState({ theme: null });
  systemDark = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: systemDark,
    addEventListener: (_event: string, fn: () => void) => {
      onChange = fn;
    },
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});
it("switches both ways and persists the selected theme through rehydration", async () => {
  const view = render(<ThemeToggle />);
  expect(document.documentElement.dataset.theme).toBe("dark");
  await userEvent.click(
    screen.getByRole("button", { name: "Switch to day mode" }),
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(
    JSON.parse(localStorage.getItem("streamverse-preferences-v1")!).state.theme,
  ).toBe("light");
  view.unmount();
  await usePreferences.persist.rehydrate();
  render(<ThemeToggle />);
  expect(document.documentElement.dataset.theme).toBe("light");
  await userEvent.click(
    screen.getByRole("button", { name: "Switch to night mode" }),
  );
  expect(document.documentElement.dataset.theme).toBe("dark");
});
it("follows the system until the user chooses a theme", async () => {
  render(<ThemeToggle />);
  act(() => {
    systemDark = false;
    onChange();
  });
  expect(document.documentElement.dataset.theme).toBe("light");
  await userEvent.click(
    screen.getByRole("button", { name: "Switch to night mode" }),
  );
  act(() => {
    systemDark = true;
    onChange();
  });
  act(() => {
    systemDark = false;
    onChange();
  });
  expect(document.documentElement.dataset.theme).toBe("dark");
});
it("still switches when persistent storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage disabled");
  });
  render(<ThemeToggle />);
  await userEvent.click(
    screen.getByRole("button", { name: "Switch to day mode" }),
  );
  expect(document.documentElement.dataset.theme).toBe("light");
});
