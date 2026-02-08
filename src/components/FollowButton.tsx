import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildFollowArgs, buildUnfollowArgs } from "../client";
import { Constants } from "../hooks/constants";
import { useWallet } from "../providers/WalletProvider";

interface FollowButtonProps {
  targetAccountId: string;
  isFollowing: boolean;
  onToggle?: (nowFollowing: boolean) => void;
  label?: string;
}

export function FollowButton({ targetAccountId, isFollowing, onToggle, label }: FollowButtonProps) {
  const { accountId, near } = useWallet();
  const [optimistic, setOptimistic] = useState(isFollowing);
  const [transacting, setTransacting] = useState(false);
  const transactingRef = useRef(transacting);
  transactingRef.current = transacting;

  // Sync optimistic state when prop changes (outside of active transaction)
  useEffect(() => {
    if (!transactingRef.current) {
      setOptimistic(isFollowing);
    }
  }, [isFollowing]);

  const handleClick = useCallback(async () => {
    if (!accountId || !near || accountId === targetAccountId) return;
    setTransacting(true);

    const nowFollowing = !optimistic;
    setOptimistic(nowFollowing);

    try {
      const kvArgs = nowFollowing
        ? buildFollowArgs(accountId, targetAccountId)
        : buildUnfollowArgs(accountId, targetAccountId);

      await near
        .transaction(accountId)
        .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", kvArgs, { gas: "10 Tgas" })
        .send();

      onToggle?.(nowFollowing);
    } catch {
      setOptimistic(!nowFollowing);
    } finally {
      setTransacting(false);
    }
  }, [accountId, near, targetAccountId, optimistic, onToggle]);

  if (!accountId || accountId === targetAccountId) return null;

  return (
    <Button
      variant={optimistic ? "outline" : "default"}
      size="sm"
      className="font-mono text-xs"
      onClick={handleClick}
      disabled={transacting}
    >
      {transacting ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : optimistic ? (
        "unfollow"
      ) : (
        (label ?? "follow")
      )}
    </Button>
  );
}
