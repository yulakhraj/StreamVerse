import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Selection } from "./store";
interface Preferences {
  favorites: string[];
  recents: string[];
  hidden: string[];
  lastRegion: Selection | null;
  toggleFavorite: (id: string) => void;
  record: (id: string) => void;
  hide: (id: string) => void;
  restore: () => void;
  remember: (selection: Selection) => void;
}
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      favorites: [],
      recents: [],
      hidden: [],
      lastRegion: null,
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
      record: (id) =>
        set((s) => ({
          recents: [id, ...s.recents.filter((x) => x !== id)].slice(0, 30),
        })),
      hide: (id) => set((s) => ({ hidden: [...new Set([...s.hidden, id])] })),
      restore: () => set({ hidden: [] }),
      remember: (lastRegion) => set({ lastRegion }),
    }),
    {
      name: "streamverse-preferences-v1",
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            /* Keep preferences in memory when storage is unavailable. */
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* Storage can be disabled. */
          }
        },
      })),
      partialize: (s) => ({
        favorites: s.favorites,
        recents: s.recents,
        hidden: s.hidden,
        lastRegion: s.lastRegion,
      }),
    },
  ),
);
