import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { Social } from "../Social";

const API_URL = "https://test.api";

function createClient() {
  return new Social({ apiUrl: API_URL, contractId: "contextual.near" });
}

let lastFetchUrl: string;

const originalFetch = globalThis.fetch;

beforeEach(() => {
  lastFetchUrl = "";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(responseBody: unknown) {
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    lastFetchUrl = String(input);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

function mockFetchCounted(responseBody: unknown) {
  let callCount = 0;
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    callCount++;
    lastFetchUrl = String(input);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return () => callCount;
}

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

describe("getProfile", () => {
  test("constructs correct URL", async () => {
    mockFetch({ name: "Alice" });
    const client = createClient();
    await client.getProfile("alice.near");

    const url = new URL(lastFetchUrl);
    expect(url.pathname).toBe("/v1/social/profile");
    expect(url.searchParams.get("account_id")).toBe("alice.near");
    expect(url.searchParams.get("contract_id")).toBe("contextual.near");
  });

  test("uses custom contractId", async () => {
    mockFetch({ name: "Alice" });
    const client = createClient();
    await client.getProfile("alice.near", "social.near");

    const url = new URL(lastFetchUrl);
    expect(url.searchParams.get("contract_id")).toBe("social.near");
  });

  test("caches profile", async () => {
    const getCount = mockFetchCounted({ name: "Alice" });
    const client = createClient();
    await client.getProfile("alice.near");
    await client.getProfile("alice.near");

    expect(getCount()).toBe(1);
  });

  test("throws on fetch failure", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    const client = createClient();
    await expect(client.getProfile("alice.near")).rejects.toThrow("Network error");
  });

  test("deduplicates in-flight requests", async () => {
    let callCount = 0;
    globalThis.fetch = mock(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return new Response(JSON.stringify({ name: "Alice" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const client = createClient();
    const [p1, p2] = await Promise.all([
      client.getProfile("alice.near"),
      client.getProfile("alice.near"),
    ]);

    expect(callCount).toBe(1);
    expect(p1).toEqual(p2);
  });
});

// ---------------------------------------------------------------------------
// getProfiles
// ---------------------------------------------------------------------------

describe("getProfiles", () => {
  test("returns Map of profiles", async () => {
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const id = url.searchParams.get("account_id");
      return new Response(JSON.stringify({ name: id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const client = createClient();
    const result = await client.getProfiles(["alice.near", "bob.near"]);

    expect(result.size).toBe(2);
    expect(result.get("alice.near")).toEqual({ name: "alice.near" });
    expect(result.get("bob.near")).toEqual({ name: "bob.near" });
  });
});

// ---------------------------------------------------------------------------
// invalidateProfile
// ---------------------------------------------------------------------------

describe("invalidateProfile", () => {
  test("evicts cached profile causing re-fetch", async () => {
    const getCount = mockFetchCounted({ name: "Alice" });
    const client = createClient();
    await client.getProfile("alice.near");
    expect(getCount()).toBe(1);

    client.invalidateProfile("alice.near");
    await client.getProfile("alice.near");

    expect(getCount()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getFollowing
// ---------------------------------------------------------------------------

describe("getFollowing", () => {
  test("constructs correct URL", async () => {
    mockFetch({ data: ["bob.near"], count: 1 });
    const client = createClient();
    await client.getFollowing("alice.near");

    const url = new URL(lastFetchUrl);
    expect(url.pathname).toBe("/v1/social/following");
    expect(url.searchParams.get("account_id")).toBe("alice.near");
    expect(url.searchParams.get("contract_id")).toBe("contextual.near");
  });

  test("passes limit and offset", async () => {
    mockFetch({ data: [], count: 0 });
    const client = createClient();
    await client.getFollowing("alice.near", { limit: 10, offset: 5 });

    const url = new URL(lastFetchUrl);
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("offset")).toBe("5");
  });

  test("caches with follow TTL", async () => {
    const getCount = mockFetchCounted({ data: ["bob.near"], count: 1 });
    const client = createClient();
    await client.getFollowing("alice.near");
    await client.getFollowing("alice.near");

    expect(getCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getFollowers
// ---------------------------------------------------------------------------

describe("getFollowers", () => {
  test("constructs correct URL", async () => {
    mockFetch({ data: ["bob.near"], count: 1 });
    const client = createClient();
    await client.getFollowers("alice.near");

    const url = new URL(lastFetchUrl);
    expect(url.pathname).toBe("/v1/social/followers");
    expect(url.searchParams.get("account_id")).toBe("alice.near");
  });
});

// ---------------------------------------------------------------------------
// invalidateFollows
// ---------------------------------------------------------------------------

describe("invalidateFollows", () => {
  test("evicts cached follows causing re-fetch", async () => {
    const getCount = mockFetchCounted({ data: [], count: 0 });
    const client = createClient();
    await client.getFollowing("alice.near");
    expect(getCount()).toBe(1);

    client.invalidateFollows("alice.near");
    await client.getFollowing("alice.near");

    expect(getCount()).toBe(2);
  });

  test("does not evict unrelated accounts", async () => {
    const getCount = mockFetchCounted({ data: [], count: 0 });
    const client = createClient();
    await client.getFollowing("alice.near");
    await client.getFollowing("bob.near");
    expect(getCount()).toBe(2);

    client.invalidateFollows("alice.near");
    await client.getFollowing("bob.near");
    // bob should still be cached
    expect(getCount()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// buildFollow / buildUnfollow
// ---------------------------------------------------------------------------

describe("buildFollow", () => {
  test("returns correct transaction shape", () => {
    const client = createClient();
    const tx = client.buildFollow("alice.near", "bob.near");
    expect(tx.contractId).toBe("contextual.near");
    expect(tx.methodName).toBe("__fastdata_kv");
    expect(tx.args["graph/follow/bob.near"]).toBe("");
    expect(tx.gas).toBe("10 Tgas");
  });

  test("respects custom contractId", () => {
    const client = createClient();
    const tx = client.buildFollow("alice.near", "bob.near", "custom.near");
    expect(tx.contractId).toBe("custom.near");
  });
});

describe("buildUnfollow", () => {
  test("returns correct transaction shape", () => {
    const client = createClient();
    const tx = client.buildUnfollow("alice.near", "bob.near");
    expect(tx.contractId).toBe("contextual.near");
    expect(tx.args["graph/follow/bob.near"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildSetProfile
// ---------------------------------------------------------------------------

describe("buildSetProfile", () => {
  test("returns correct transaction shape", () => {
    const client = createClient();
    const tx = client.buildSetProfile("alice.near", { name: "Alice", about: "Hi" });
    expect(tx.contractId).toBe("contextual.near");
    expect(tx.methodName).toBe("__fastdata_kv");
    expect(tx.args["profile/name"]).toBe("Alice");
    expect(tx.args["profile/about"]).toBe("Hi");
  });

  test("respects custom contractId", () => {
    const client = createClient();
    const tx = client.buildSetProfile("alice.near", { name: "Alice" }, "social.near");
    expect(tx.contractId).toBe("social.near");
  });
});
