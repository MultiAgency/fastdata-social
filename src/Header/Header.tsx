import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet } from "../providers/WalletProvider";
import { AccountNavbar } from "./SignIn/AccountNavbar";

const primaryLinks: { to: string; label: string }[] = [];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { accountId } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allLinks = [
    ...primaryLinks,
    ...(accountId ? [{ to: `/graph/${accountId}` as string, label: "Graph" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-2xl">
      <div className="flex h-14 sm:h-16 items-center px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-[3px] mr-4 sm:mr-6 shrink-0 group">
          <img src="/logo.png" alt="" className="w-9 h-9 sm:w-10 sm:h-10" />
          <span className="text-base sm:text-lg font-semibold tracking-tight">
            <span className="text-primary group-hover:drop-shadow-[0_0_8px_oklch(0.82_0.19_155_/_40%)] transition-[filter] duration-300">
              NEAR Directory
            </span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5 mr-auto">
          {allLinks.map((link) => {
            const active =
              pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-mono transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20" />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          <a
            className="text-muted-foreground hover:text-primary transition-colors"
            href="https://github.com/MultiAgency/fastdata-social"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="sr-only">GitHub</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <AccountNavbar />
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 ml-auto md:hidden">
          <AccountNavbar />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
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
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-2xl animate-slide-up">
          <div className="px-4 py-3 space-y-1 animate-fade-up-stagger">
            {allLinks.map((link) => {
              const active =
                pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-mono transition-all active:scale-[0.98] ${
                    active
                      ? "text-primary bg-primary/10 border border-primary/20"
                      : "text-muted-foreground hover:text-primary hover:bg-secondary/40"
                  }`}
                >
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="px-4 pb-4 pt-1 border-t border-border/30">
            <a
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary transition-colors font-mono rounded-xl"
              href="https://github.com/MultiAgency/fastdata-social"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              github_
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
