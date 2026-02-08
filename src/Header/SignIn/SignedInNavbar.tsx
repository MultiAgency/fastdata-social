import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useWallet } from "../../providers/WalletProvider";

export function SignedInNavbar() {
  const { accountId, disconnectWallet } = useWallet();

  return (
    <div className="flex items-center gap-1.5">
      <Link
        to="/profile/$accountId"
        params={{ accountId: accountId ?? "" }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 hover:border-primary/30 transition-all group"
      >
        <svg
          className="w-4 h-4 text-primary shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-sm font-mono truncate max-w-[8em] sm:max-w-[12em] text-foreground group-hover:text-primary transition-colors">
          {accountId}
        </span>
      </Link>
      <Button
        variant="secondary"
        size="icon-sm"
        onClick={disconnectWallet}
        className="bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-primary transition-colors rounded-lg"
        aria-label="Disconnect wallet"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </Button>
    </div>
  );
}
