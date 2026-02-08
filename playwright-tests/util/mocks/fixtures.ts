/** Deterministic fixture payloads for FastData API mocking. */

export const FIXTURES = {
	healthOk: { status: "ok" },

	emptyFollowers: { accounts: [], count: 0 },
	emptyFollowing: { accounts: [], count: 0 },

	sampleFollowers: {
		accounts: ["alice.near", "bob.near", "carol.near"],
		count: 3,
	},

	sampleFollowing: {
		accounts: ["dave.near", "eve.near"],
		count: 2,
	},

	/** Directory: accounts returned by /v1/kv/accounts scan */
	directoryAccounts: {
		data: ["alice.near", "bob.near", "carol.near", "dave.near"],
		meta: { has_more: false },
	},

	/** Directory: tag-filtered accounts via /v1/kv/by-key (client expects { entries }) */
	tagFilteredAccounts: {
		entries: [
			{
				predecessor_id: "alice.near",
				current_account_id: "contextual.near",
				key: "profile/tags/developer",
				value: "",
				block_height: 100000,
				block_timestamp: 1700000000000,
				receipt_id: "mock-receipt",
				tx_hash: "mock-tx",
			},
		],
	},

	/** Profile data for e2e-test.near */
	sampleProfile: {
		name: "E2E Tester",
		image: { url: "https://example.com/avatar.png" },
		about: "Test account for Playwright",
		tags: { developer: "", tester: "" },
		linktree: { github: "e2e-test" },
	},

	apiError500: { error: "Internal Server Error" },
} as const;
