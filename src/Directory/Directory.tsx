import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFollowArgs } from "../client";
import type { Profile } from "../client/types";
import { AccountCard } from "../components/AccountCard";
import { Constants } from "../hooks/constants";
import { useClient } from "../hooks/useClient";
import { useWallet } from "../providers/WalletProvider";
import { TransactionAlert } from "../Social/TransactionAlert";
import type { Transaction } from "../types";
import { isValidNearAccount } from "../utils/validation";

const PAGE_SIZE = 24;

/** Responsive column count based on container width. */
function useColumnCount(ref: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(() =>
    typeof window === "undefined"
      ? 1
      : window.innerWidth >= 1024
        ? 3
        : window.innerWidth >= 640
          ? 2
          : 1,
  );
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setCols(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

export function Directory() {
  const client = useClient();
  const { accountId, near } = useWallet();

  const [accounts, setAccounts] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile | null>>(new Map());
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasProfile, setHasProfile] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingAccount, setPendingAccount] = useState("");
  const [validationError, setValidationError] = useState("");
  const [transacting, setTransacting] = useState(false);
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const fetchedProfilesRef = useRef(new Set<string>());

  // Client-side search filter
  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    const lower = searchTerm.toLowerCase();
    return accounts.filter((id) => {
      if (id.toLowerCase().includes(lower)) return true;
      const p = profiles.get(id);
      return p?.name ? p.name.toLowerCase().includes(lower) : false;
    });
  }, [accounts, profiles, searchTerm]);

  // Virtual scrolling
  const gridRef = useRef<HTMLDivElement>(null);
  const cols = useColumnCount(gridRef);
  const rowCount = Math.ceil(filteredAccounts.length / cols);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 160,
    overscan: 5,
    scrollMargin: gridRef.current?.offsetTop ?? 0,
  });

  // Load directory: all accounts across all contracts
  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    client
      .kvAccounts(undefined, undefined, {
        limit: PAGE_SIZE + 1,
        afterAccount: cursor,
        scan: true,
      })
      .then((res) => {
        if (cancelled) return;
        const hasExtra = res.data.length > PAGE_SIZE;
        setHasMore(hasExtra || res.meta.has_more);
        const page = res.data.slice(0, PAGE_SIZE);
        setAccounts((prev) => (cursor ? [...prev, ...page] : page));
      })
      .catch(() => {
        if (cancelled) return;
        setAccounts([]);
        setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cursor]);

  // Batch-fetch profiles whenever accounts change
  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  useEffect(() => {
    const missing = accounts.filter((id) => !fetchedProfilesRef.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) fetchedProfilesRef.current.add(id);

    let cancelled = false;
    client.getProfiles(missing).then((batch) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = new Map(prev);
        for (const [id, p] of batch) next.set(id, p);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [accounts]);

  // Load signed-in user's following set + check if has profile
  // biome-ignore lint/correctness/useExhaustiveDependencies: client is a singleton
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    Promise.all([client.getFollowing(accountId), client.getProfile(accountId)])
      .then(([followingRes, profile]) => {
        if (cancelled) return;
        setFollowingSet(new Set(followingRes.accounts));
        setHasProfile(!!profile && Object.keys(profile).length > 0);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const handleFollowToggle = useCallback((target: string, nowFollowing: boolean) => {
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (nowFollowing) next.add(target);
      else next.delete(target);
      return next;
    });
  }, []);

  const handleFollow = useCallback(
    async (target: string) => {
      if (!target) {
        setValidationError("Please enter an account ID");
        return;
      }
      if (!isValidNearAccount(target)) {
        setValidationError("Invalid NEAR account format");
        return;
      }
      if (target === accountId) {
        setValidationError("You cannot follow yourself");
        return;
      }
      if (followingSet.has(target)) {
        setValidationError("Already following this account");
        return;
      }
      if (!accountId || !near) return;
      setTransacting(true);
      setValidationError("");

      try {
        const followArgs = buildFollowArgs(accountId, target);
        const result = await near
          .transaction(accountId)
          .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", followArgs, { gas: "10 Tgas" })
          .send();
        const txId = (result?.transaction?.hash as string) || null;
        setFollowingSet((prev) => new Set(prev).add(target));
        setLastTx({ type: "follow", account: target, txId, status: "success" });
        setPendingAccount("");
        client.invalidateFollows(accountId);
      } catch {
        setLastTx({ type: "follow", account: target, txId: null, status: "error", error: true });
      } finally {
        setTransacting(false);
      }
    },
    [accountId, near, followingSet, client],
  );

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          indexed by{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">__fastdata_kv</code>
        </p>
      </div>

      {/* Profile prompt for signed-in users without a profile */}
      {accountId && !hasProfile && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            <Link
              to="/profile/$accountId"
              params={{ accountId: accountId ?? "" }}
              className="text-primary hover:underline font-mono"
            >
              Set up your profile &rarr;
            </Link>
          </p>
        </div>
      )}

      <div className="mb-6">
        <Input
          placeholder="Search accounts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="font-mono bg-secondary/30 border-border/40 rounded-lg h-10 max-w-sm"
        />
      </div>

      {accountId && (
        <div className="mb-6">
          <TransactionAlert transaction={lastTx} onDismiss={() => setLastTx(null)} />
          <div className="flex gap-2 max-w-sm">
            <Input
              placeholder="alice.near"
              value={pendingAccount}
              onChange={(e) => {
                setPendingAccount(e.target.value);
                setValidationError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFollow(pendingAccount);
              }}
              disabled={transacting}
              className={`font-mono bg-secondary/30 border-border/40 rounded-lg h-10 ${validationError ? "border-destructive/60 focus:border-destructive" : "focus:border-primary/40"}`}
            />
            <Button
              onClick={() => handleFollow(pendingAccount)}
              disabled={transacting || !pendingAccount}
              className="font-mono rounded-lg h-10 px-5 shrink-0"
            >
              {transacting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "follow_"
              )}
            </Button>
          </div>
          {validationError && (
            <p className="text-xs text-destructive mt-2 font-mono">{validationError}</p>
          )}
        </div>
      )}

      {loading && accounts.length === 0 ? (
        <div className="flex justify-center py-20">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <svg
              aria-hidden="true"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">No one here yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">No accounts found.</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No accounts matching &quot;{searchTerm}&quot;</p>
        </div>
      ) : (
        <>
          <div ref={gridRef} style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * cols;
              const rowItems = filteredAccounts.slice(startIdx, startIdx + cols);
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - (virtualizer.options.scrollMargin ?? 0)}px)`,
                  }}
                >
                  <div
                    className="pb-4"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gap: "1rem",
                    }}
                  >
                    {rowItems.map((id) => (
                      <AccountCard
                        key={id}
                        accountId={id}
                        profile={profiles.get(id) ?? null}
                        isFollowing={followingSet.has(id)}
                        onFollowToggle={handleFollowToggle}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && !searchTerm && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="sm"
                className="font-mono"
                disabled={loading}
                onClick={() => setCursor(accounts[accounts.length - 1])}
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  "load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
