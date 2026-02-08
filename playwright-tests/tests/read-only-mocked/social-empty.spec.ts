import { test, expect } from "@playwright/test";
import { mockFastDataApi } from "../../util/mocks/fastdata-api";
import { expectAppShell, injectTestWallet } from "../../util/selectors";

test.describe("Connections page — empty state", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await injectTestWallet(page);
		// Default mocks return empty followers/following
		await mockFastDataApi(page);
	});

	test("followers page shows empty message", async ({ page }) => {
		await page.goto("/profile/e2e-test.near/followers", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should show breadcrumb link to profile
		await expect(page.getByRole("link", { name: "e2e-test.near" }).first()).toBeVisible();
		await expect(page.getByText("0 total")).toBeVisible();

		// Empty state message
		await expect(page.getByText("No followers yet.")).toBeVisible();
	});

	test("following page shows empty message", async ({ page }) => {
		await page.goto("/profile/e2e-test.near/following", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should show breadcrumb link to profile
		await expect(page.getByRole("link", { name: "e2e-test.near" }).first()).toBeVisible();
		await expect(page.getByText("0 total")).toBeVisible();

		// Empty state message
		await expect(page.getByText("Not following anyone yet.")).toBeVisible();
	});
});
