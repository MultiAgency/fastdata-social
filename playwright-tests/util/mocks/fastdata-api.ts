import type { Page } from "@playwright/test";
import { FIXTURES } from "./fixtures";

/** Override specific endpoint responses. Unspecified endpoints use defaults. */
export interface MockOverrides {
	health?: object | false;
	followers?: object;
	following?: object;
	accounts?: object;
	kvByKey?: object;
	profile?: object | null;
}

/**
 * Intercept all requests to the FastData API and return fixture data.
 * In production the app hits https://fastdata.up.railway.app;
 * in dev it hits http://localhost:3001. We match both.
 */
export async function mockFastDataApi(page: Page, overrides: MockOverrides = {}) {
	await page.route(
		(url) =>
			url.hostname === "fastdata.up.railway.app" ||
			(url.hostname === "localhost" && url.port === "3001"),
		async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;

			// Health check
			if (path === "/health") {
				if (overrides.health === false) {
					return route.fulfill({ status: 503, json: FIXTURES.apiError500 });
				}
				return route.fulfill({ json: overrides.health ?? FIXTURES.healthOk });
			}

			// KV accounts (Directory)
			if (path === "/v1/kv/accounts") {
				return route.fulfill({ json: overrides.accounts ?? FIXTURES.directoryAccounts });
			}

			// KV by-key (tag filtering)
			if (path === "/v1/kv/by-key") {
				return route.fulfill({ json: overrides.kvByKey ?? FIXTURES.tagFilteredAccounts });
			}

			// Social profile
			if (path === "/v1/social/profile") {
				return route.fulfill({ json: overrides.profile ?? FIXTURES.sampleProfile });
			}

			// Social endpoints
			if (path === "/v1/social/followers") {
				return route.fulfill({ json: overrides.followers ?? FIXTURES.emptyFollowers });
			}
			if (path === "/v1/social/following") {
				return route.fulfill({ json: overrides.following ?? FIXTURES.emptyFollowing });
			}
				// Everything else — pass through
			await route.continue();
		},
	);
}
