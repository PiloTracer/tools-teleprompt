import type { Theme } from "./storage";

/** Sync app shell tokens via foundation doc 02 (`data-theme` on `<html>`). */
export function applyDocumentTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}
