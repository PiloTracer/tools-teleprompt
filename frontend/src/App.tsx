import { useEffect } from "react";

import { AppRoutes } from "./routes";
import { loadSettings } from "./prompter/storage";
import { applyDocumentTheme } from "./prompter/theme";

export default function App() {
  useEffect(() => {
    void loadSettings().then((settings) => applyDocumentTheme(settings.theme));
  }, []);

  return <AppRoutes />;
}
