import { Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Profile } from "../client/types";
import { AccountCard } from "../components/AccountCard";
import { useClient } from "../hooks/useClient";
import { useWallet } from "../providers/WalletProvider";

const PAGE_SIZE = 24;

interface ConnectionsProps {
  type: "followers" | "following";
}

export function Connections({ type }: ConnectionsProps) {
  const { accountId: paramAccountId } = useParams({ strict: false }) as { accountId: string };
  const { accountId: signedInAccount } = useWallet();
  const client = useClient();

  const [accounts, setAccounts] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile | null>>(new Map());
  const [count, setCount] = useState(0);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetch =
      type === "followers"
        ? client.getFollowers(paramAccountId, { limit: PAGE_SIZE, offset })
        : client.getFollowing(paramAccountId, { limit: PAGE_SIZE, offset });

    fetch
      .then((res) => {
        if (!cancelled) {
          setAccounts(res.accounts);
          setCount(res.count);
        }
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paramAccountId, type, offset]);

  // Batch-fetch profiles when accounts change
  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  useEffect(() => {
    if (accounts.length === 0) return;
    let cancelled = false;
    setProfiles(new Map());
    client.getProfiles(accounts).then((batch) => {
      if (!cancelled) setProfiles(batch);
    });
    return () => {
      cancelled = true;
    };
  }, [accounts]);

  // Load signed-in user's following set for follow buttons
  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  useEffect(() => {
    if (!signedInAccount) return;
    client
      .getFollowing(signedInAccount)
      .then((res) => setFollowingSet(new Set(res.accounts)))
      .catch(() => {});
  }, [signedInAccount]);

  const handleFollowToggle = useCallback((target: string, nowFollowing: boolean) => {
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (nowFollowing) next.add(target);
      else next.delete(target);
      return next;
    });
  }, []);

  const hasMore = offset + PAGE_SIZE < count;

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/profile/$accountId"
            params={{ accountId: paramAccountId }}
            className="text-muted-foreground hover:text-foreground text-sm font-mono transition-colors"
          >
            {paramAccountId}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-mono">{type}</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{count} total</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">
            {type === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((id) => (
              <AccountCard
                key={id}
                accountId={id}
                profile={profiles.get(id) ?? null}
                isFollowing={followingSet.has(id)}
                onFollowToggle={handleFollowToggle}
              />
            ))}
          </div>
          {(offset > 0 || hasMore) && (
            <div className="flex justify-center gap-3 mt-6">
              {offset > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  prev
                </Button>
              )}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  next
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
