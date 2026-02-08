import { type Page, expect } from "@playwright/test";

/** Assert the app shell (header nav + brand) is visible. */
export async function expectAppShell(page: Page) {
	const nav = page.getByRole("navigation");
	await expect(nav).toBeVisible();
	await expect(nav.getByRole("link", { name: "fastdata" })).toBeVisible();
}

/** Inject a fake wallet accountId so protected routes render without real signing. */
export function injectTestWallet(page: Page, accountId = "e2e-test.near") {
	return page.addInitScript((id) => {
		(window as unknown as Record<string, unknown>).__E2E_ACCOUNT_ID = id;
	}, accountId);
}
