import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { en } from "../lib/i18n/en";
import "../styles/prompter.css";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="tp-layout">
      <header className="tp-header">
        <Link to="/" className="tp-brand">
          {en.appTitle}
        </Link>
        <nav className="tp-nav" aria-label="Primary">
          <NavLink to="/" end>
            {en.nav.editor}
          </NavLink>
          <NavLink to="/play">{en.nav.player}</NavLink>
          <NavLink to="/settings">{en.nav.settings}</NavLink>
          <NavLink to="/handoff">{en.nav.handoff}</NavLink>
        </nav>
      </header>
      <div className="tp-content">{children}</div>
    </div>
  );
}
