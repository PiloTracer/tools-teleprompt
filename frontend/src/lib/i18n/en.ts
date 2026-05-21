export const en = {
  appTitle: "tools-teleprompt",
  nav: {
    editor: "Editor",
    player: "Player",
    settings: "Settings",
    handoff: "Handoff",
  },
  editor: {
    label: "Script",
    hint: "Paste, type, or drop a .txt or .md file",
    dropHint: "Drop file here",
  },
  preview: {
    title: "Preview",
    formatPlain: "Plain text",
    formatMarkdown: "Markdown",
  },
  settings: {
    title: "Settings",
    speed: "Scroll speed",
    fontSize: "Font size",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    mirror: "Mirror text (camera setups)",
    saved: "Settings saved",
  },
  errors: {
    fileType: "Only .txt and .md files are supported",
    storage: "Could not save script — storage may be full",
  },
  play: {
    title: "Player",
    stub: "Teleprompter player — implemented in M4.",
  },
  handoff: {
    title: "Handoff",
    stub: "Cross-device handoff — pairing UI in M5/M6.",
    back: "Back to editor",
  },
} as const;

export type Messages = typeof en;
