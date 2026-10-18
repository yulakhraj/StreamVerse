import { usePreferences } from "./preferences";
import { create } from "zustand";
export type Selection = {
  type: "all" | "country" | "region" | "category" | "favorites" | "recents";
  code: string;
  name: string;
};
interface UIState {
  selection: Selection | null;
  choose: (selection: Selection | null) => void;
}
export const useStore = create<UIState>((set) => ({
  selection: null,
  choose: (selection) => {
    if (selection && !["favorites", "recents"].includes(selection.type))
      usePreferences.getState().remember(selection);
    set({ selection });
  },
}));
