/**
 * Validates NEAR account ID format according to official NEAR Protocol specification
 *
 * **Security:** Prevents injection attacks by validating account ID format.
 * Use this for ALL user-provided account IDs before using them in:
 * - Contract calls
 * - localStorage keys
 * - Template literals
 * - DOM rendering
 *
 * Supports:
 * - NEAR-implicit accounts: 64 lowercase hex characters
 * - ETH-implicit accounts: '0x' + 40 lowercase hex characters
 * - NEAR-deterministic accounts: '0s' + 40 lowercase hex characters
 * - Named accounts: 2-64 chars following NEAR naming rules (supports all TLDs: .near, .testnet, .tg, etc.)
 *
 * @see https://nomicon.io/DataStructures/Account
 * @param accountId - Account ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidNearAccount(accountId: string): boolean {
  if (!accountId) return false;

  // Reject system account (reserved by protocol)
  if (accountId === 'system') {
    return false;
  }

  // NEAR-implicit account: 64 lowercase hex characters
  if (/^[0-9a-f]{64}$/.test(accountId)) {
    return true;
  }

  // ETH-implicit account: '0x' + 40 lowercase hex characters
  if (/^0x[0-9a-f]{40}$/.test(accountId)) {
    return true;
  }

  // NEAR-deterministic account: '0s' + 40 lowercase hex characters
  if (/^0s[0-9a-f]{40}$/.test(accountId)) {
    return true;
  }

  // Named account validation
  // Length: 2-64 characters
  if (accountId.length < 2 || accountId.length > 64) {
    return false;
  }

  // Official NEAR regex for named accounts:
  // ^(([a-z\d]+[\-_])*[a-z\d]+\.)*([a-z\d]+[\-_])*[a-z\d]+$
  //
  // Breaking it down:
  // - Account ID parts separated by '.'
  // - Each part: lowercase alphanumeric separated by '-' or '_'
  // - Cannot start/end with separator
  // - Cannot have consecutive separators
  const accountIdRegex = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

  return accountIdRegex.test(accountId);
}

/**
 * Formats account ID for display
 * Truncates long implicit accounts for better UX
 */
export function formatAccountId(accountId: string): string {
  if (!accountId) return "";

  // Truncate long implicit accounts for display
  if (accountId.length === 64) {
    return `${accountId.slice(0, 8)}...${accountId.slice(-8)}`;
  }

  return accountId;
}

/**
 * Generates transaction explorer URL
 */
export function getTxExplorerUrl(txHash: string, explorerUrl: string): string {
  return `${explorerUrl}/${txHash}`;
}
