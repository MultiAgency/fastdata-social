import { formatAccountId } from "../utils/validation";

interface AccountListProps {
  accounts: string[];
  onUnfollow?: (account: string) => void;
  disabled: boolean;
  type: "following" | "followers";
  currentUser: string | null;
  loading: boolean;
}

/**
 * AccountList component displays a list of accounts (following or followers)
 */
export function AccountList({
  accounts,
  onUnfollow,
  disabled,
  type,
  loading,
}: AccountListProps) {
  // Loading state
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-secondary">Loading {type}...</p>
      </div>
    );
  }

  // Empty state
  if (!accounts || accounts.length === 0) {
    const emptyMessage =
      type === "following"
        ? "Not following anyone yet. Enter an account above to follow."
        : "No followers yet.";

    return (
      <div className="text-center py-4 text-secondary">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="list-group">
      {accounts.map((accountId) => (
        <div
          key={accountId}
          className="list-group-item d-flex justify-content-between align-items-center"
        >
          <div>
            <code className="text-dark">{accountId}</code>
            {accountId.length === 64 && (
              <small className="text-muted ms-2">
                ({formatAccountId(accountId)})
              </small>
            )}
          </div>
          {type === "following" && onUnfollow && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onUnfollow(accountId)}
              disabled={disabled}
            >
              Unfollow
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
