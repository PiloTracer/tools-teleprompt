import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "../prompter/Layout";
import { HandoffClaim } from "../pairing/HandoffClaim";
import { HandoffCreate } from "../pairing/HandoffCreate";

export function HandoffPage() {
  return (
    <Layout>
      <main>
        <Routes>
          <Route index element={<Navigate to="create" replace />} />
          <Route path="create" element={<HandoffCreate />} />
          <Route path="claim/:token" element={<HandoffClaim />} />
        </Routes>
      </main>
    </Layout>
  );
}
