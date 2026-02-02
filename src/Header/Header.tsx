import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet } from "../providers/WalletProvider";
import { AccountNavbar } from "./SignIn/AccountNavbar";

const navLinks = [
  { to: "/playground" as const, label: "Playground" },
  { to: "/upload" as const, label: "Upload" },
  { to: "/social" as const, label: "Social" },
  { to: "/graph" as const, label: "Graph" },
  { to: "/explorer" as const, label: "Explorer" },
  { to: "/profile" as const, label: "Profile" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isConnected } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 sm:px-6 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mr-6 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-primary"
            >
              <path
                d="M2 8L8 2L14 8L8 14Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M5 8L8 5L11 8L8 11Z" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight font-mono">
            fast<span className="text-primary">data</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        {isConnected && (
          <div className="hidden md:flex items-center gap-1 mr-auto">
            {navLinks.map((link) => {
              const active = pathname === link.to || pathname.startsWith(`${link.to}/`);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label.toLowerCase()}_
                </Link>
              );
            })}
          </div>
        )}

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          <a
            className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            href="https://fastfs.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs_
          </a>
          <AccountNavbar />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="ml-auto md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-4 pb-4 pt-2">
          {isConnected && (
            <div className="flex flex-col gap-1 mb-3">
              {navLinks.map((link) => {
                const active = pathname === link.to || pathname.startsWith(`${link.to}/`);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-mono transition-colors ${
                      active
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {link.label.toLowerCase()}_
                  </Link>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <a
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              href="https://fastfs.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs_
            </a>
            <AccountNavbar />
          </div>
        </div>
      )}
    </nav>
  );
}
