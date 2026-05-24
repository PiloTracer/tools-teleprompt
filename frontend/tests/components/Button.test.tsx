import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "../../src/components/ds/Button";

describe("Button", () => {
  it("renders with default secondary md variant", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("ds-button");
    expect(button).toHaveAttribute("data-variant", "secondary");
    expect(button).toHaveAttribute("data-size", "md");
  });

  it("applies primary variant and sm size", () => {
    render(
      <Button variant="primary" size="sm" aria-pressed={true}>
        Play
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Play" });
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("data-size", "sm");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("forwards ref and respects disabled", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <Button ref={ref} disabled>
        Off
      </Button>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByRole("button", { name: "Off" })).toBeDisabled();
  });
});
