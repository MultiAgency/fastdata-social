import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AccountNavbar } from "./SignIn/AccountNavbar";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mr-8 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
              <path d="M2 8L8 2L14 8L8 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5 8L8 5L11 8L8 11Z" fill="currentColor" opacity="0.4"/>
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight font-mono">
            fast<span className="text-primary">data</span>
          </span>
        </Link>
        <button
          className="ml-auto md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <div className={`${menuOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row md:items-center absolute md:static top-16 left-0 right-0 bg-background/95 backdrop-blur-xl md:bg-transparent border-b md:border-0 p-4 md:p-0 gap-4 md:gap-0 w-full md:w-auto`}>
          <div className="flex-1">
            <a
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              href="https://fastfs.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs_
            </a>
          </div>
          <div className="flex items-center gap-3">
            <AccountNavbar />
          </div>
        </div>
      </div>
    </nav>
  );
}
