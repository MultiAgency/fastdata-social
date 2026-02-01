import { formatAccountId } from "../utils/validation";
import { Button } from "@/components/ui/button";

interface AccountListProps {
  accounts: string[];
  onUnfollow?: (account: string) => void;
  disabled: boolean;
  type: "following" | "followers";
  currentUser: string | null;
  loading: boolean;
}

export function AccountList({
  accounts,
  onUnfollow,
  disabled,
  type,
  loading,
}: AccountListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground font-mono">loading {type}_</p>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    const emptyMessage =
      type === "following"
        ? "Not following anyone yet. Enter an account above to follow."
        : "No followers yet.";

    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 divide-y divide-border">
      {accounts.map((accountId) => (
        <div
          key={accountId}
          className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/50" />
            <code className="text-sm font-mono">{accountId}</code>
            {accountId.length === 64 && (
              <span className="text-xs text-muted-foreground font-mono">
                ({formatAccountId(accountId)})
              </span>
            )}
          </div>
          {type === "following" && onUnfollow && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive font-mono text-xs"
              onClick={() => onUnfollow(accountId)}
              disabled={disabled}
            >
              unfollow
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
