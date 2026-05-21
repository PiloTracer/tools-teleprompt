import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "../prompter/Layout";
import { HandoffClaim } from "../pairing/HandoffClaim";
import { HandoffCreate } from "../pairing/HandoffCreate";
import { LanConsume } from "../pairing/LanConsume";
import { MultiQrConsume } from "../pairing/MultiQrConsume";
import { QrConsume } from "../pairing/QrConsume";

export function HandoffPage() {
  return (
    <Layout>
      <main>
        <Routes>
          <Route index element={<Navigate to="create" replace />} />
          <Route path="create" element={<HandoffCreate />} />
          <Route path="receive" element={<QrConsume />} />
          <Route path="multi" element={<MultiQrConsume />} />
          <Route path="lan/:token" element={<LanConsume />} />
          <Route path="claim/:token" element={<HandoffClaim />} />
        </Routes>
      </main>
    </Layout>
  );
}
