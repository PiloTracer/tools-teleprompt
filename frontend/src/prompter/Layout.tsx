import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { en } from "../lib/i18n/en";
import "../styles/prompter.css";

type LayoutProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { to: "/", end: true as const, label: en.nav.editor, shortLabel: en.nav.editorShort },
  { to: "/play", end: false as const, label: en.nav.player, shortLabel: en.nav.playerShort },
  { to: "/settings", end: false as const, label: en.nav.settings, shortLabel: en.nav.settingsShort },
  { to: "/handoff", end: false as const, label: en.nav.handoff, shortLabel: en.nav.handoffShort },
] as const;

function NavLinks({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          aria-label={compact ? item.label : undefined}
          title={compact ? item.label : undefined}
        >
          {compact ? item.shortLabel : item.label}
        </NavLink>
      ))}
    </>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="tp-layout">
      <a className="ds-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="tp-header">
        <Link to="/" className="tp-brand">
          {en.appTitle}
        </Link>
        <nav className="tp-nav tp-nav--desktop" aria-label="Primary">
          <NavLinks />
        </nav>
      </header>
      <div id="main-content" className="tp-content">
        {children}
      </div>
      <nav className="ds-mobile-nav" aria-label="Primary mobile">
        <NavLinks compact />
      </nav>
    </div>
  );
}
