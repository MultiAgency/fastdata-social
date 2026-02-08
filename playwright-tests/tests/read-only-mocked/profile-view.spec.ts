import { test, expect } from "@playwright/test";
import { FIXTURES } from "../../util/mocks/fixtures";
import { mockFastDataApi } from "../../util/mocks/fastdata-api";
import { expectAppShell, injectTestWallet } from "../../util/selectors";

test.describe("Profile view — other user", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await mockFastDataApi(page, {
			followers: FIXTURES.sampleFollowers,
			following: FIXTURES.sampleFollowing,
		});
	});

	test("displays profile data", async ({ page }) => {
		await page.goto("/profile/e2e-test.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Profile name and bio from fixture
		await expect(page.getByText("E2E Tester")).toBeVisible();
		await expect(page.getByText("Test account for Playwright")).toBeVisible();

		// Account ID visible in profile card (not just in header nav)
		const profileCard = page.locator(".rounded-2xl").first();
		await expect(profileCard.getByText("e2e-test.near")).toBeVisible();
	});

	test("displays follower and following counts", async ({ page }) => {
		await page.goto("/profile/e2e-test.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		// Follower count from sampleFollowers (3)
		await expect(page.getByRole("link", { name: /followers/ })).toContainText("3");
		// Following count from sampleFollowing (2)
		await expect(page.getByRole("link", { name: /following/ })).toContainText("2");
	});

	test("displays tags", async ({ page }) => {
		await page.goto("/profile/e2e-test.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("link", { name: "developer" })).toBeVisible();
		await expect(page.getByRole("link", { name: "tester" })).toBeVisible();
	});
});

test.describe("Profile view — own profile", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await injectTestWallet(page);
		await mockFastDataApi(page, {
			followers: FIXTURES.sampleFollowers,
			following: FIXTURES.sampleFollowing,
		});
	});

	test("shows edit controls on own profile", async ({ page }) => {
		await page.goto("/profile/e2e-test.near", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Own profile should show edit button (not follow)
		await expect(page.getByRole("button", { name: /edit/i })).toBeVisible();
	});
});
