import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { formatAccountId } from "../utils/validation";

const ROW_HEIGHT = 48;
const MAX_VISIBLE_ROWS = 10;

interface AccountListProps {
  accounts: string[];
  onUnfollow?: (account: string) => void;
  disabled: boolean;
  type: "following" | "followers";
  loading: boolean;
}

export function AccountList({ accounts, onUnfollow, disabled, type, loading }: AccountListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: accounts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <span className="sr-only">Loading...</span>
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

  const listHeight = Math.min(accounts.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

  return (
    <div
      ref={parentRef}
      className="rounded-xl border border-border bg-card/50 overflow-auto"
      style={{ height: listHeight }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const accountId = accounts[virtualRow.index];
          return (
            <div
              key={accountId}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="flex items-center justify-between px-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: ROW_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`,
              }}
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
          );
        })}
      </div>
    </div>
  );
}
