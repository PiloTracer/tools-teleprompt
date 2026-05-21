import { Navigate, Route, Routes } from "react-router-dom";

import { HandoffPage } from "./HandoffPage";
import { HomePage } from "./HomePage";
import { PlayPage } from "./PlayPage";
import { SettingsPage } from "./SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play" element={<PlayPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/handoff/*" element={<HandoffPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
