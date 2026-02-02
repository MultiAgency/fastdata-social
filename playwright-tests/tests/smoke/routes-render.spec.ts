import { test } from "@playwright/test";
import { expectAppShell } from "../../util/selectors";

const routes = ["/upload", "/social", "/graph", "/explorer"] as const;

for (const route of routes) {
	test.describe(route, () => {
		// /graph loads a large 3D bundle — give it extra time
		if (route === "/graph") {
			test.setTimeout(60_000);
		}

		test("renders app shell", async ({ page }) => {
			await page.goto(route, { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle");
			await expectAppShell(page);
		});

		test("survives refresh", async ({ page }) => {
			await page.goto(route, { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle");
			await expectAppShell(page);

			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle");
			await expectAppShell(page);
		});
	});
}
