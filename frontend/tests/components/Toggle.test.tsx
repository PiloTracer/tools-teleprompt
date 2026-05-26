import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Toggle } from "../../src/components/ds/Toggle";

describe("Toggle", () => {
  it("renders switch with label and ds-toggle class", () => {
    render(<Toggle label="Mirror text" />);
    const toggle = screen.getByRole("switch", { name: /mirror text/i });
    expect(toggle.closest("label")).toHaveClass("ds-toggle");
  });

  it("reflects checked state and calls onChange", () => {
    const onChange = vi.fn();
    render(<Toggle label="Speech sync" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: /speech sync/i });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalled();
  });

  it("applies compact size and respects disabled", () => {
    render(<Toggle label="Compact" size="compact" disabled />);
    const toggle = screen.getByRole("switch", { name: /compact/i });
    expect(toggle.closest("label")).toHaveAttribute("data-size", "compact");
    expect(toggle).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Toggle ref={ref} label="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute("role", "switch");
  });
});
