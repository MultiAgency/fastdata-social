import { test, expect } from "@playwright/test";
import { mockFastDataApi } from "../../util/mocks/fastdata-api";
import { expectAppShell, expectExplorerPage, injectTestWallet } from "../../util/selectors";

test.describe("/explorer with mocked data", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await injectTestWallet(page);
		await mockFastDataApi(page);
	});

	test("renders explorer with tree view", async ({ page }) => {
		await page.goto("/explorer", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);
		await expectExplorerPage(page);

		// Quick path buttons should be visible
		await expect(page.getByRole("button", { name: "Explore profile" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Explore graph" })).toBeVisible();

		// Tree/JSON view toggle should be present
		await expect(page.getByRole("button", { name: "Tree view" })).toBeVisible();
		await expect(page.getByRole("button", { name: "JSON view" })).toBeVisible();
	});
});
