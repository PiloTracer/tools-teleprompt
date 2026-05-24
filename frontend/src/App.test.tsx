import { render, screen, waitFor } from "@testing-library/react";
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

  it("renders settings route", async () => {
    renderAt("/settings");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    });
  });

  it("renders handoff create route", async () => {
    renderAt("/handoff/create");
    expect(await screen.findByRole("heading", { name: "Cross-device handoff" })).toBeInTheDocument();
  });
});
