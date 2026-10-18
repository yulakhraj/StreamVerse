import { useLayoutEffect, useSyncExternalStore } from "react";
import { usePreferences } from "./preferences";
const query = "(prefers-color-scheme: dark)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function useTheme() {
  const preference = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
  const theme = preference ?? (systemDark ? "dark" : "light");
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
