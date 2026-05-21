import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App routes", () => {
  it("renders the app title on home route", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "tools-teleprompt" })).toBeInTheDocument();
  });

  it("renders play route", () => {
    renderAt("/play");
    expect(screen.getByRole("heading", { name: "Player" })).toBeInTheDocument();
  });

  it("renders settings route", () => {
    renderAt("/settings");
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders handoff route", () => {
    renderAt("/handoff");
    expect(screen.getByRole("heading", { name: "Handoff" })).toBeInTheDocument();
  });
});
