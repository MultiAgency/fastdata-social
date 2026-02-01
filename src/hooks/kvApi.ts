import { Constants } from "./constants";
import type { KVQueryResponse } from "../types";

/**
 * Fetch accounts that the given accountId follows
 * Uses generic KV query with key prefix filter
 *
 * API Response Format:
 * {
 *   "entries": [
 *     { "predecessor_id": "james.near", "key": "graph/follow/alice.near", "value": "" }
 *   ]
 * }
 */
export async function fetchFollowing(accountId: string): Promise<string[] | null> {
  try {
    const params = new URLSearchParams({
      predecessor_id: accountId,
      current_account_id: "social.near",
      key_prefix: "graph/follow/",
      exclude_null: "true",
    });

    const response = await fetch(
      `${Constants.API_BASE_URL}/v1/kv/query?${params}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) throw new Error("API request failed");
    const data: KVQueryResponse = await response.json();

    // Parse response: extract account from key
    // "graph/follow/alice.near" → "alice.near"
    const accounts = (data.entries || []).map((entry) => {
      const key = entry.key;
      return key.replace("graph/follow/", "");
    });

    return accounts;
  } catch (error) {
    console.error("Failed to fetch following:", error);
    return null; // Signals API unavailable
  }
}

/**
 * Fetch accounts that follow the given accountId
 * Uses reverse KV query (materialized view)
 *
 * API Response Format:
 * {
 *   "entries": [
 *     { "predecessor_id": "bob.near", "key": "graph/follow/alice.near", "value": "" }
 *   ]
 * }
 *
 * @param {string} accountId - The account to fetch followers for
 * @returns {Promise<string[] | null>} - Array of account IDs or null if API unavailable
 */
export async function fetchFollowers(accountId: string): Promise<string[] | null> {
  try {
    const params = new URLSearchParams({
      current_account_id: "social.near",
      key: `graph/follow/${accountId}`,
      exclude_null: "true",
    });

    const response = await fetch(
      `${Constants.API_BASE_URL}/v1/kv/reverse?${params}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) throw new Error("API request failed");
    const data: KVQueryResponse = await response.json();

    // Parse response: extract predecessor_id (who set the key)
    const accounts = (data.entries || []).map((entry) => entry.predecessor_id);

    return accounts;
  } catch (error) {
    console.error("Failed to fetch followers:", error);
    return null;
  }
}

/**
 * Check if KV API server is running
 * @returns {Promise<boolean>} - Whether the API server is available
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${Constants.API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
