import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../providers/WalletProvider";
import { useNear } from "@near-kit/react";
import { Constants } from "../hooks/constants";
import { fetchFollowing, fetchFollowers, checkApiHealth } from "../hooks/kvApi";
import { isValidNearAccount } from "../utils/validation";
import { TransactionAlert } from "./TransactionAlert";
import { AccountList } from "./AccountList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction } from "../types";

export function Social() {
  const { accountId } = useWallet();
  const near = useNear();

  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [transacting, setTransacting] = useState<boolean>(false);
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const [pendingAccount, setPendingAccount] = useState<string>("");
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!accountId) return;
    const FOLLOWING_KEY = `fastnear_following_${accountId}`;

    setLoading(true);

    const isApiHealthy = await checkApiHealth();
    setApiAvailable(isApiHealthy);

    if (isApiHealthy) {
      const followingData = await fetchFollowing(accountId);
      const followersData = await fetchFollowers(accountId);

      if (followingData !== null) {
        setFollowing(followingData);
        localStorage.setItem(FOLLOWING_KEY, JSON.stringify(followingData));
      }

      if (followersData !== null) {
        setFollowers(followersData);
      }
    } else {
      const stored = localStorage.getItem(FOLLOWING_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFollowing(parsed);
        } catch (err) {
          console.warn('Failed to parse localStorage data, removing corrupted key:', err);
          localStorage.removeItem(FOLLOWING_KEY);
        }
      }
      setFollowers([]);
    }

    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validateAccount = useCallback((account: string): boolean => {
    if (!account) {
      setValidationError("Please enter an account ID");
      return false;
    }

    if (!isValidNearAccount(account)) {
      setValidationError("Invalid NEAR account format");
      return false;
    }

    if (account === accountId) {
      setValidationError("You cannot follow yourself");
      return false;
    }

    setValidationError("");
    return true;
  }, [accountId]);

  const handleFollow = useCallback(
    async (targetAccount: string) => {
      if (!validateAccount(targetAccount)) return;

      if (following.includes(targetAccount)) {
        setValidationError("Already following this account");
        return;
      }

      setTransacting(true);
      setValidationError("");
      const followingKey = `fastnear_following_${accountId}`;

      try {
        const kvArgs = {
          [`graph/follow/${targetAccount}`]: "",
        };

        if (!near) throw new Error("Wallet not connected");

        const result = await near.call(
          Constants.KV_CONTRACT_ID,
          "__fastdata_kv",
          kvArgs,
          { gas: "10 Tgas" }
        );

        const txId = result?.transaction?.hash as string | void;

        const newFollowing = [...following, targetAccount];
        setFollowing(newFollowing);
        localStorage.setItem(followingKey, JSON.stringify(newFollowing));

        setLastTx({
          type: "follow",
          account: targetAccount,
          txId: txId || null,
          status: "success",
        });

        setPendingAccount("");

        setTimeout(() => {
          loadData();
        }, 3000);
      } catch (error: unknown) {
        console.error("Follow error:", error);
        setLastTx({
          type: "follow",
          account: targetAccount,
          txId: null,
          status: "success",
          error: true,
        });

        const newFollowing = [...following, targetAccount];
        setFollowing(newFollowing);
        localStorage.setItem(followingKey, JSON.stringify(newFollowing));

        setPendingAccount("");

        setTimeout(() => {
          loadData();
        }, 3000);
      } finally {
        setTransacting(false);
      }
    },
    [following, accountId, near, validateAccount, loadData]
  );

  const handleUnfollow = useCallback(
    async (targetAccount: string) => {
      setTransacting(true);
      const followingKey = `fastnear_following_${accountId}`;

      try {
        const kvArgs = {
          [`graph/follow/${targetAccount}`]: null,
        };

        if (!near) throw new Error("Wallet not connected");

        const result = await near.call(
          Constants.KV_CONTRACT_ID,
          "__fastdata_kv",
          kvArgs,
          { gas: "10 Tgas" }
        );

        const txId = result?.transaction?.hash as string | void;

        const newFollowing = following.filter((id) => id !== targetAccount);
        setFollowing(newFollowing);
        localStorage.setItem(followingKey, JSON.stringify(newFollowing));

        setLastTx({
          type: "unfollow",
          account: targetAccount,
          txId: txId || null,
          status: "success",
        });

        setTimeout(() => {
          loadData();
        }, 3000);
      } catch (error: unknown) {
        console.error("Unfollow error:", error);
        setLastTx({
          type: "unfollow",
          account: targetAccount,
          txId: null,
          status: "success",
          error: true,
        });

        const newFollowing = following.filter((id) => id !== targetAccount);
        setFollowing(newFollowing);
        localStorage.setItem(followingKey, JSON.stringify(newFollowing));

        setTimeout(() => {
          loadData();
        }, 3000);
      } finally {
        setTransacting(false);
      }
    },
    [following, accountId, near, loadData]
  );

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Social Graph</h1>
        <p className="text-sm text-muted-foreground font-mono">
          follow accounts via FastData KV protocol
        </p>
      </div>

      {!apiAvailable && (
        <Alert variant="default" className="mb-4 border-l-2 border-l-accent bg-accent/5">
          <AlertDescription>
            <span className="font-semibold text-accent">KV API unavailable</span>
            <br />
            <span className="text-sm text-muted-foreground">
              Run <code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">kv-api-server</code> to see following/followers.
              Write operations still work.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <TransactionAlert
        transaction={lastTx}
        onDismiss={() => setLastTx(null)}
      />

      <div className="mb-8 p-5 rounded-xl border border-border bg-card/50">
        <label className="text-sm font-medium text-muted-foreground mb-3 block font-mono">follow_</label>
        <div className="flex gap-2">
          <Input
            placeholder="alice.near"
            value={pendingAccount}
            onChange={(e) => {
              setPendingAccount(e.target.value);
              setValidationError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFollow(pendingAccount);
              }
            }}
            disabled={transacting}
            className={`font-mono bg-secondary/50 ${validationError ? "border-destructive" : ""}`}
          />
          <Button
            onClick={() => handleFollow(pendingAccount)}
            disabled={transacting || !pendingAccount}
            className="glow-primary font-mono"
          >
            {transacting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ...
              </span>
            ) : (
              "follow"
            )}
          </Button>
        </div>
        {validationError && (
          <p className="text-sm text-destructive mt-2 font-mono">{validationError}</p>
        )}
      </div>

      <Tabs defaultValue="following">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="following" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            following ({following.length})
          </TabsTrigger>
          <TabsTrigger value="followers" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            followers ({followers.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="following">
          <AccountList
            accounts={following}
            onUnfollow={handleUnfollow}
            disabled={transacting}
            type="following"
            currentUser={accountId}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="followers">
          <AccountList
            accounts={followers}
            disabled={transacting}
            type="followers"
            currentUser={accountId}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
