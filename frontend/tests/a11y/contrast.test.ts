import { describe, expect, it } from "vitest";

import { assertContrastPairs, type ContrastPair } from "./contrast";

const LIGHT_PLAYER: ContrastPair[] = [
  {
    name: "script on player viewport",
    foreground: "#1a1a1a",
    background: "#ffffff",
    minRatio: 4.5,
  },
  {
    name: "primary text on canvas",
    foreground: "#1a1a1a",
    background: "#f8f9fa",
    minRatio: 4.5,
  },
  {
    name: "secondary nav on canvas",
    foreground: "#555555",
    background: "#f8f9fa",
    minRatio: 4.5,
  },
  {
    name: "accent on primary button",
    foreground: "#ffffff",
    background: "#2563eb",
    minRatio: 4.5,
  },
  {
    name: "accent active nav on canvas",
    foreground: "#1d4ed8",
    background: "#e5ecfd",
    minRatio: 4.5,
  },
];

const PLAYER_DARK: ContrastPair[] = [
  {
    name: "script on dark viewport",
    foreground: "#f0f0f0",
    background: "#000000",
    minRatio: 4.5,
  },
  {
    name: "range track on dark toolbar",
    foreground: "#707070",
    background: "#242424",
    minRatio: 3,
  },
  {
    name: "toolbar labels on elevated",
    foreground: "#a8a8a8",
    background: "#242424",
    minRatio: 4.5,
  },
  {
    name: "primary on dark accent button",
    foreground: "#ffffff",
    background: "#1d4ed8",
    minRatio: 4.5,
  },
];

const EDITOR_LIGHT: ContrastPair[] = [
  {
    name: "editor script on inset preview",
    foreground: "#1a1a1a",
    background: "#e8eaed",
    minRatio: 4.5,
  },
  {
    name: "editor label on surface card",
    foreground: "#1a1a1a",
    background: "#ffffff",
    minRatio: 4.5,
  },
  {
    name: "editor hint on surface card",
    foreground: "#555555",
    background: "#ffffff",
    minRatio: 4.5,
  },
];

describe("S1 token contrast (UIS-04)", () => {
  it("meets WCAG AA for light player pairs", () => {
    const results = assertContrastPairs(LIGHT_PLAYER);
    for (const row of results) {
      expect(row.pass, `${row.name}: ${row.ratio}:1 (need ${row.minRatio}:1)`).toBe(true);
    }
  });

  it("meets WCAG AA for player-dark scoped pairs", () => {
    const results = assertContrastPairs(PLAYER_DARK);
    for (const row of results) {
      expect(row.pass, `${row.name}: ${row.ratio}:1 (need ${row.minRatio}:1)`).toBe(true);
    }
  });
});

const EDITOR_DARK: ContrastPair[] = [
  {
    name: "editor script on dark inset textarea",
    foreground: "#f0f0f0",
    background: "#141414",
    minRatio: 4.5,
  },
  {
    name: "editor preview on dark inset",
    foreground: "#f0f0f0",
    background: "#141414",
    minRatio: 4.5,
  },
  {
    name: "editor label on dark surface card",
    foreground: "#f0f0f0",
    background: "#242424",
    minRatio: 4.5,
  },
  {
    name: "editor hint on dark surface card",
    foreground: "#a8a8a8",
    background: "#242424",
    minRatio: 4.5,
  },
  {
    name: "format label on dark inset track",
    foreground: "#a8a8a8",
    background: "#141414",
    minRatio: 4.5,
  },
];

describe("S2 editor contrast (UIS-04)", () => {
  it("meets WCAG AA for home editor token pairs (light)", () => {
    const results = assertContrastPairs(EDITOR_LIGHT);
    for (const row of results) {
      expect(row.pass, `${row.name}: ${row.ratio}:1 (need ${row.minRatio}:1)`).toBe(true);
    }
  });

  it("meets WCAG AA for home editor token pairs (dark)", () => {
    const results = assertContrastPairs(EDITOR_DARK);
    for (const row of results) {
      expect(row.pass, `${row.name}: ${row.ratio}:1 (need ${row.minRatio}:1)`).toBe(true);
    }
  });
});

const SETTINGS_DARK: ContrastPair[] = [
  {
    name: "range track on dark settings surface",
    foreground: "#707070",
    background: "#1a1a1a",
    minRatio: 3,
  },
  {
    name: "settings title on dark surface card",
    foreground: "#f0f0f0",
    background: "#1a1a1a",
    minRatio: 4.5,
  },
  {
    name: "settings label on dark surface",
    foreground: "#a8a8a8",
    background: "#1a1a1a",
    minRatio: 4.5,
  },
  {
    name: "primary save on dark accent",
    foreground: "#ffffff",
    background: "#1d4ed8",
    minRatio: 4.5,
  },
];

describe("S3 settings contrast (UIS-04)", () => {
  it("meets WCAG AA for dark settings shell pairs", () => {
    const results = assertContrastPairs(SETTINGS_DARK);
    for (const row of results) {
      expect(row.pass, `${row.name}: ${row.ratio}:1 (need ${row.minRatio}:1)`).toBe(true);
    }
  });
});
