import { test, expect } from "@playwright/test";
import { FIXTURES } from "../../util/mocks/fixtures";
import { mockFastDataApi } from "../../util/mocks/fastdata-api";
import { expectAppShell, injectTestWallet } from "../../util/selectors";

test.describe("Connections page — populated data", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await injectTestWallet(page);
		await mockFastDataApi(page, {
			followers: FIXTURES.sampleFollowers,
			following: FIXTURES.sampleFollowing,
		});
	});

	test("followers page displays account cards", async ({ page }) => {
		await page.goto("/profile/e2e-test.near/followers", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should show count
		await expect(page.getByText("3 total")).toBeVisible();

		// Should render account cards for each follower
		await expect(page.getByText("alice.near")).toBeVisible();
		await expect(page.getByText("bob.near")).toBeVisible();
		await expect(page.getByText("carol.near")).toBeVisible();

		// Should NOT show empty state
		await expect(page.getByText("No followers yet.")).not.toBeVisible();
	});

	test("following page displays account cards", async ({ page }) => {
		await page.goto("/profile/e2e-test.near/following", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should show count
		await expect(page.getByText("2 total")).toBeVisible();

		// Should render account cards for accounts being followed
		await expect(page.getByText("dave.near")).toBeVisible();
		await expect(page.getByText("eve.near")).toBeVisible();

		// Should NOT show empty state
		await expect(page.getByText("Not following anyone yet.")).not.toBeVisible();
	});

});
