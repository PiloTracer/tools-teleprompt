import { registerSW } from "virtual:pwa-register";

import { en } from "../lib/i18n/en";

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

/** Register the PWA service worker and prompt when a new version is available (R10). */
export function registerPrompterServiceWorker(): void {
  if (!import.meta.env.PROD) {
    return;
  }

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdatePrompt();
    },
  });
}

function showUpdatePrompt(): void {
  const banner = document.createElement("div");
  banner.className = "tp-sw-update";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `
    <p>${en.pwa.updateAvailable}</p>
    <button type="button" data-action="reload">${en.pwa.reload}</button>
    <button type="button" data-action="dismiss">${en.pwa.dismiss}</button>
  `;

  banner.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    if (target.dataset.action === "reload" && updateServiceWorker) {
      void updateServiceWorker(true);
      return;
    }
    banner.remove();
  });

  document.body.append(banner);
}
