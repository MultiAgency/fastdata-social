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

	/** Minimal socialKeys response for explorer tree. */
	sampleSocialKeys: {
		"e2e-test.near": {
			profile: {
				name: "",
				image: { url: "" },
				about: "",
			},
			graph: {
				follow: {
					"alice.near": "",
				},
			},
		},
	},

	/** Matching socialGet response for explorer tree. */
	sampleSocialGet: {
		"e2e-test.near": {
			profile: {
				name: "E2E Tester",
				image: { url: "https://example.com/avatar.png" },
				about: "Test account for Playwright",
			},
			graph: {
				follow: {
					"alice.near": "",
				},
			},
		},
	},

	apiError500: { error: "Internal Server Error" },
} as const;
