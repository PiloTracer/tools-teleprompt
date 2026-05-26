import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/tokens.css";
import "./styles/themes/dark.css";
import "./styles/themes/player-dark.css";
import "./styles/components/ds-button.css";
import "./styles/components/ds-card.css";
import "./styles/components/ds-section.css";
import "./styles/components/ds-textarea.css";
import "./styles/components/ds-range.css";
import "./styles/components/ds-select.css";
import "./styles/components/ds-toggle.css";
import "./styles/components/ds-segmented.css";
import "./styles/components/ds-alert.css";
import "./styles/components/ds-mobile-nav.css";
import "./styles/components/ds-copy-button.css";
import "./styles/components/ds-qr-frame.css";
import "./styles/handoff.css";
import "./index.css";
import { registerPrompterServiceWorker } from "./pwa/registerSW";

registerPrompterServiceWorker();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
