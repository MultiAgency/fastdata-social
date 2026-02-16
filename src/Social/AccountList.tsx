import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { FollowButton } from "../components/FollowButton";
import { formatAccountId } from "../utils/validation";

const ROW_HEIGHT = 48;
const MAX_VISIBLE_ROWS = 10;

interface AccountListProps {
  accounts: string[];
  followingSet: Set<string>;
  onFollowToggle?: (accountId: string, nowFollowing: boolean) => void;
  type: "following" | "followers";
  loading: boolean;
}

export function AccountList({
  accounts,
  followingSet,
  onFollowToggle,
  type,
  loading,
}: AccountListProps) {
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
    const emptyMessage = type === "following" ? "Not following anyone yet." : "No followers yet.";

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
              className="relative flex items-center justify-between px-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: ROW_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Link
                to="/profile/$accountId"
                params={{ accountId }}
                className="absolute inset-0"
                aria-label={accountId}
              />
              <span className="flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-primary/50" />
                <code className="text-sm font-mono">{accountId}</code>
                {accountId.length === 64 && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ({formatAccountId(accountId)})
                  </span>
                )}
              </span>
              <span className="relative z-10">
                <FollowButton
                  targetAccountId={accountId}
                  isFollowing={followingSet.has(accountId)}
                  onToggle={(now) => onFollowToggle?.(accountId, now)}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
