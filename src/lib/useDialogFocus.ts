import { useEffect, type RefObject } from "react";
export function useDialogFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    if (!root) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...root.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),video[controls],[tabindex="0"]',
        ),
      ].filter((e) => e.tabIndex >= 0 && !e.hidden && !e.closest("[hidden]"));
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const topDialog = document.querySelector("dialog[open]");
      if (topDialog && !root.contains(topDialog)) return;
      const list = focusable(),
        first = list[0],
        last = list.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !root.contains(document.activeElement))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !root.contains(document.activeElement))
      ) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref]);
}
