import { test, expect } from "@playwright/test";
import { FIXTURES } from "../../util/mocks/fixtures";
import { mockFastDataApi } from "../../util/mocks/fastdata-api";
import { expectAppShell, injectTestWallet } from "../../util/selectors";

test.describe("Follow button behavior", () => {
	test.setTimeout(60_000);

	test("follow button hidden when viewing own profile", async ({ page }) => {
		await injectTestWallet(page, "e2e-test.near");
		await mockFastDataApi(page, {
			followers: FIXTURES.sampleFollowers,
			following: FIXTURES.sampleFollowing,
		});

		// View own profile
		await page.goto("/profile/e2e-test.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should show edit button instead of follow
		await expect(page.getByRole("link", { name: "edit_" })).toBeVisible();

		// Follow button should NOT be visible
		await expect(page.getByRole("button", { name: "follow" })).not.toBeVisible();
		await expect(page.getByRole("button", { name: "unfollow" })).not.toBeVisible();
	});

	test("follow button shown when viewing other profile", async ({ page }) => {
		await injectTestWallet(page, "e2e-test.near");
		await mockFastDataApi(page, {
			followers: FIXTURES.emptyFollowers,
			following: FIXTURES.emptyFollowing,
		});

		// View another user's profile
		await page.goto("/profile/alice.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should show follow button (not edit)
		await expect(page.getByRole("button", { name: "follow" })).toBeVisible();
		await expect(page.getByRole("link", { name: "edit_" })).not.toBeVisible();
	});

	test("follow button hidden when not signed in", async ({ page }) => {
		// Do NOT inject test wallet — user is not signed in
		await mockFastDataApi(page, {
			followers: FIXTURES.sampleFollowers,
			following: FIXTURES.sampleFollowing,
		});

		// View someone's profile without being signed in
		await page.goto("/profile/alice.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Follow button should NOT be visible (requires sign-in)
		await expect(page.getByRole("button", { name: "follow" })).not.toBeVisible();
		await expect(page.getByRole("button", { name: "unfollow" })).not.toBeVisible();
		await expect(page.getByRole("link", { name: "edit_" })).not.toBeVisible();
	});
});
