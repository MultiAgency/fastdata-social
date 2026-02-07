import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useWallet } from "../providers/WalletProvider";
import { isValidNearAccount } from "../utils/validation";
import { AccountNavbar } from "./SignIn/AccountNavbar";

const primaryLinks = [
  { to: "/" as const, label: "Directory" },
  { to: "/explorer" as const, label: "Explorer" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { accountId } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const allLinks = [
    ...primaryLinks,
    ...(accountId
      ? [
          { to: `/profile/${accountId}` as string, label: "Profile" },
          { to: `/graph/${accountId}` as string, label: "Graph" },
        ]
      : []),
  ];

  const handleSearch = () => {
    const value = search.trim().toLowerCase();
    if (!value) return;
    if (isValidNearAccount(value)) {
      navigate({ to: "/profile/$accountId", params: { accountId: value } });
    }
    setSearch("");
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 sm:px-6 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mr-6 group shrink-0">
          <span className="text-lg font-semibold tracking-tight font-mono">
            <span className="text-primary">__fastdata_</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 mr-auto">
          {allLinks.map((link) => {
            const active =
              pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to));
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

        {/* Desktop search + right side */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          <Input
            placeholder="alice.near"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono bg-secondary/50 w-40 h-8 text-xs"
          />
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
          <div className="flex flex-col gap-1 mb-3">
            {allLinks.map((link) => {
              const active =
                pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to));
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
          <div className="mb-3">
            <Input
              placeholder="alice.near"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono bg-secondary/50 text-xs"
            />
          </div>
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
