import { type Page, expect } from "@playwright/test";

/** Assert the app shell (header nav + brand) is visible. */
export async function expectAppShell(page: Page) {
	const nav = page.getByRole("navigation");
	await expect(nav).toBeVisible();
	await expect(nav.getByRole("link", { name: "fastdata" })).toBeVisible();
}
