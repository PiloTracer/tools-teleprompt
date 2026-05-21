import { Link, Route, Routes, useLocation } from "react-router-dom";

import { en } from "../lib/i18n/en";
import { Layout } from "../prompter/Layout";

function HandoffIndex() {
  return (
    <>
      <h1>{en.handoff.title}</h1>
      <p>{en.handoff.stub}</p>
      <p>
        <Link to="/">{en.handoff.back}</Link>
      </p>
    </>
  );
}

function HandoffSubRoute() {
  const { pathname } = useLocation();
  return (
    <>
      <h1>{en.handoff.title}</h1>
      <p>Route: {pathname}</p>
      <p>
        <Link to="/handoff">{en.handoff.title}</Link> · <Link to="/">{en.handoff.back}</Link>
      </p>
    </>
  );
}

export function HandoffPage() {
  return (
    <Layout>
      <main>
        <Routes>
          <Route index element={<HandoffIndex />} />
          <Route path="*" element={<HandoffSubRoute />} />
        </Routes>
      </main>
    </Layout>
  );
}
