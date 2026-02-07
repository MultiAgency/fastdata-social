import type { Page } from "@playwright/test";
import { FIXTURES } from "./fixtures";

/** Override specific endpoint responses. Unspecified endpoints use defaults. */
export interface MockOverrides {
	health?: object | false;
	followers?: object;
	following?: object;
	socialKeys?: object;
	socialGet?: object;
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

			// Social endpoints (POST)
			if (path === "/v1/social/followers") {
				return route.fulfill({ json: overrides.followers ?? FIXTURES.emptyFollowers });
			}
			if (path === "/v1/social/following") {
				return route.fulfill({ json: overrides.following ?? FIXTURES.emptyFollowing });
			}
			if (path === "/v1/social/keys") {
				return route.fulfill({ json: overrides.socialKeys ?? FIXTURES.sampleSocialKeys });
			}
			if (path === "/v1/social/get") {
				return route.fulfill({ json: overrides.socialGet ?? FIXTURES.sampleSocialGet });
			}

			// KV endpoints — pass through by default
			await route.continue();
		},
	);
}
