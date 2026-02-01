import { Constants } from "../../hooks/constants";

export async function fetchKeys(
  patterns: string[],
  options?: { return_type?: boolean }
): Promise<Record<string, any>> {
  try {
    const body: any = { keys: patterns };
    if (options) body.options = options;
    const res = await fetch(`${Constants.API_BASE_URL}/v1/social/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error("Failed to fetch keys");
    return res.json();
  } catch (error) {
    console.error("fetchKeys error:", error);
    return {};
  }
}

export async function fetchValues(
  patterns: string[],
  options?: { with_block_height?: boolean }
): Promise<Record<string, any>> {
  try {
    const body: any = { keys: patterns };
    if (options) body.options = options;
    const res = await fetch(`${Constants.API_BASE_URL}/v1/social/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error("Failed to fetch values");
    return res.json();
  } catch (error) {
    console.error("fetchValues error:", error);
    return {};
  }
}

export async function fetchKeyDetail(
  predecessorId: string,
  key: string
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      predecessor_id: predecessorId,
      current_account_id: "social.near",
      key,
    });
    const res = await fetch(`${Constants.API_BASE_URL}/v1/kv/get?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error("Failed to fetch key detail");
    return res.json();
  } catch (error) {
    console.error("fetchKeyDetail error:", error);
    return null;
  }
}
