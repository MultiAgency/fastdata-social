import { Constants } from "../hooks/constants";
import { getTxExplorerUrl } from "../utils/validation";
import type { Transaction } from "../types";

interface TransactionAlertProps {
  transaction: Transaction | null;
  onDismiss: () => void;
}

/**
 * TransactionAlert component displays the latest transaction status
 * with educational messages about KV transaction behavior
 */
export function TransactionAlert({ transaction, onDismiss }: TransactionAlertProps) {
  if (!transaction) return null;

  const { type, account, txId, status, error } = transaction;

  // Determine alert styling based on status
  const getAlertClass = (): string => {
    if (error) return "alert-warning";
    if (status === "processing") return "alert-info";
    return "alert-success";
  };

  // Generate user-friendly message
  const getMessage = (): JSX.Element | string => {
    if (error) {
      return (
        <>
          <strong>Transaction sent</strong> (may show as failed in wallet)
          <br />
          <small>
            KV transactions often appear as "failed" but your data is still
            being indexed. This is expected behavior.
          </small>
        </>
      );
    }

    if (type === "follow") {
      return (
        <>
          <strong>Followed {account}</strong>
          <br />
          <small>Data is being indexed (~2-3 seconds)</small>
        </>
      );
    }

    if (type === "unfollow") {
      return (
        <>
          <strong>Unfollowed {account}</strong>
          <br />
          <small>Data is being indexed (~2-3 seconds)</small>
        </>
      );
    }

    return "Transaction submitted";
  };

  return (
    <div className={`alert ${getAlertClass()} alert-dismissible fade show`} role="alert">
      {getMessage()}
      {txId && (
        <div className="mt-2">
          <a
            href={getTxExplorerUrl(txId, Constants.EXPLORER_URL)}
            target="_blank"
            rel="noopener noreferrer"
            className="alert-link"
          >
            View transaction →
          </a>
        </div>
      )}
      <button
        type="button"
        className="btn-close"
        onClick={onDismiss}
        aria-label="Close"
      ></button>
    </div>
  );
}
