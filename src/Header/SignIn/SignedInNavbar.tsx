import { useWallet } from "../../providers/WalletProvider";
import { Button } from "@/components/ui/button";

export function SignedInNavbar() {
  const { accountId, disconnectWallet } = useWallet();
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-mono truncate max-w-[14em] text-foreground/90">{accountId}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={disconnectWallet} className="text-muted-foreground hover:text-foreground font-mono text-xs">
        disconnect_
      </Button>
    </div>
  );
}
