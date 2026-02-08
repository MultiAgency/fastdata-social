import { test, expect } from "@playwright/test";
import { mockFastDataApi } from "../../util/mocks/fastdata-api";
import { expectAppShell } from "../../util/selectors";

test.describe("Directory page", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		await mockFastDataApi(page);
	});

	test("renders account cards from scan", async ({ page }) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expectAppShell(page);

		// Should render account cards for each fixture account
		await expect(page.getByText("alice.near")).toBeVisible();
		await expect(page.getByText("bob.near")).toBeVisible();
		await expect(page.getByText("carol.near")).toBeVisible();
		await expect(page.getByText("dave.near")).toBeVisible();

		// Should NOT show empty state
		await expect(page.getByText("No one here yet")).not.toBeVisible();
	});

	test("shows empty state when no accounts", async ({ page }) => {
		await mockFastDataApi(page, {
			accounts: { data: [], meta: { has_more: false } },
		});

		await page.goto("/", { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("networkidle");

		await expect(page.getByText("No accounts found.")).toBeVisible();
	});
});
