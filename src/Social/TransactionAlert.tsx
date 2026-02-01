import { Constants } from "../hooks/constants";
import { getTxExplorerUrl } from "../utils/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Transaction } from "../types";

interface TransactionAlertProps {
  transaction: Transaction | null;
  onDismiss: () => void;
}

export function TransactionAlert({ transaction, onDismiss }: TransactionAlertProps) {
  if (!transaction) return null;

  const { type, account, txId, error } = transaction;

  return (
    <Alert
      variant="default"
      className={`relative mb-4 border-l-2 ${
        error ? "border-l-accent bg-accent/5" : "border-l-primary bg-primary/5"
      }`}
    >
      <AlertDescription>
        {error ? (
          <>
            <span className="font-semibold text-accent">Transaction sent</span>
            <br />
            <span className="text-sm text-muted-foreground">
              KV transactions may show as "failed" in wallet — your data is still being indexed.
            </span>
          </>
        ) : type === "follow" ? (
          <>
            <span className="font-semibold text-primary">Followed {account}</span>
            <br />
            <span className="text-sm text-muted-foreground font-mono">indexing (~2-3s)</span>
          </>
        ) : type === "unfollow" ? (
          <>
            <span className="font-semibold text-primary">Unfollowed {account}</span>
            <br />
            <span className="text-sm text-muted-foreground font-mono">indexing (~2-3s)</span>
          </>
        ) : (
          "Transaction submitted"
        )}
        {txId && (
          <div className="mt-2">
            <a
              href={getTxExplorerUrl(txId, Constants.EXPLORER_URL)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-primary hover:underline"
            >
              view tx →
            </a>
          </div>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
        aria-label="Close"
      >
        ×
      </Button>
    </Alert>
  );
}
