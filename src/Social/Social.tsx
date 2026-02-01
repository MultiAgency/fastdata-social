import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../providers/WalletProvider";
import { useNear } from "@near-kit/react";
import { Constants } from "../hooks/constants";
import { fetchFollowing, fetchFollowers, checkApiHealth } from "../hooks/kvApi";
import { isValidNearAccount } from "../utils/validation";
import { TransactionAlert } from "./TransactionAlert";
import { AccountList } from "./AccountList";
import type { Transaction } from "../types";
import "./Social.css";

export function Social() {
  const { accountId } = useWallet();
  const near = useNear();

  // State management
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");
  const [transacting, setTransacting] = useState<boolean>(false);
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const [pendingAccount, setPendingAccount] = useState<string>("");
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>("");

  // Load data from API or localStorage
  const loadData = useCallback(async () => {
    if (!accountId) return;
    const FOLLOWING_KEY = `fastnear_following_${accountId}`;

    setLoading(true);

    // Check API health
    const isApiHealthy = await checkApiHealth();
    setApiAvailable(isApiHealthy);

    if (isApiHealthy) {
      // Load from API
      const followingData = await fetchFollowing(accountId);
      const followersData = await fetchFollowers(accountId);

      if (followingData !== null) {
        setFollowing(followingData);
        // Update localStorage as cache
        localStorage.setItem(FOLLOWING_KEY, JSON.stringify(followingData));
      }

      if (followersData !== null) {
        setFollowers(followersData);
      }
    } else {
      // Fall back to localStorage
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

  // Load data on mount and when account changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validate account input
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

  // Handle follow action
  const handleFollow = useCallback(
    async (targetAccount: string) => {
      if (!validateAccount(targetAccount)) return;

      // Check if already following
      if (following.includes(targetAccount)) {
        setValidationError("Already following this account");
        return;
      }

      setTransacting(true);
      setValidationError("");
      const followingKey = `fastnear_following_${accountId}`;

      try {
        // Create KV transaction args - plain JSON, no encoding!
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

        // Optimistic update
        const newFollowing = [...following, targetAccount];
        setFollowing(newFollowing);
        localStorage.setItem(followingKey, JSON.stringify(newFollowing));

        // Set transaction status
        setLastTx({
          type: "follow",
          account: targetAccount,
          txId: txId || null,
          status: "success",
        });

        // Clear input
        setPendingAccount("");

        // Reload from API after indexer delay
        setTimeout(() => {
          loadData();
        }, 3000);
      } catch (error: unknown) {
        console.error("Follow error:", error);
        // Still show success - KV transactions often "fail" but work
        setLastTx({
          type: "follow",
          account: targetAccount,
          txId: null,
          status: "success",
          error: true,
        });

        // Optimistic update even on error
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

  // Handle unfollow action
  const handleUnfollow = useCallback(
    async (targetAccount: string) => {
      setTransacting(true);
      const followingKey = `fastnear_following_${accountId}`;

      try {
        // Create KV transaction with null deletion marker
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

        // Optimistic update
        const newFollowing = following.filter((id) => id !== targetAccount);
        setFollowing(newFollowing);
        localStorage.setItem(followingKey, JSON.stringify(newFollowing));

        // Set transaction status
        setLastTx({
          type: "unfollow",
          account: targetAccount,
          txId: txId || null,
          status: "success",
        });

        // Reload from API after indexer delay
        setTimeout(() => {
          loadData();
        }, 3000);
      } catch (error: unknown) {
        console.error("Unfollow error:", error);
        // Still show success - KV transactions often "fail" but work
        setLastTx({
          type: "unfollow",
          account: targetAccount,
          txId: null,
          status: "success",
          error: true,
        });

        // Optimistic update even on error
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
    <div>
      <div className="mb-3 text-center">
        <h1>FastData KV Social Graph</h1>
        <p className="text-secondary">
          Follow accounts using FastData KV protocol (no contract required!)
        </p>
      </div>

      {/* API Status Banner */}
      {!apiAvailable && (
        <div className="alert alert-warning" role="alert">
          <strong>KV API unavailable</strong>
          <br />
          <small>
            Run <code>kv-api-server</code> to see following/followers lists.
            Write operations still work.
          </small>
        </div>
      )}

      {/* Transaction Alert */}
      <TransactionAlert
        transaction={lastTx}
        onDismiss={() => setLastTx(null)}
      />

      {/* Follow Input */}
      <div className="mb-4">
        <h4>Follow Someone</h4>
        <div className="input-group">
          <input
            type="text"
            className={`form-control ${validationError ? "is-invalid" : ""}`}
            placeholder="Enter NEAR account (e.g., alice.near)"
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
          />
          <button
            className="btn btn-primary"
            onClick={() => handleFollow(pendingAccount)}
            disabled={transacting || !pendingAccount}
          >
            {transacting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Following...
              </>
            ) : (
              "Follow"
            )}
          </button>
        </div>
        {validationError && (
          <div className="invalid-feedback d-block">{validationError}</div>
        )}
      </div>

      {/* Sub-tabs for Following/Followers */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "following" ? "active" : ""}`}
            onClick={() => setActiveTab("following")}
          >
            Following ({following.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "followers" ? "active" : ""}`}
            onClick={() => setActiveTab("followers")}
          >
            Followers ({followers.length})
          </button>
        </li>
      </ul>

      {/* Account Lists */}
      {activeTab === "following" ? (
        <AccountList
          accounts={following}
          onUnfollow={handleUnfollow}
          disabled={transacting}
          type="following"
          currentUser={accountId}
          loading={loading}
        />
      ) : (
        <AccountList
          accounts={followers}
          disabled={transacting}
          type="followers"
          currentUser={accountId}
          loading={loading}
        />
      )}
    </div>
  );
}
