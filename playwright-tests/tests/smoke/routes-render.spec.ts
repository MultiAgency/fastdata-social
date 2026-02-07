import { test } from "@playwright/test";
import { expectAppShell, injectTestWallet } from "../../util/selectors";

const routes = ["/", "/upload", "/profile", "/graph/e2e-test.near", "/explorer"] as const;

for (const route of routes) {
	test.describe(route, () => {
		// /graph loads a large 3D bundle — give it extra time
		if (route.startsWith("/graph")) {
			test.setTimeout(60_000);
		}

		test("renders app shell", async ({ page }) => {
			// Inject test wallet so NearProvider wraps all routes
			await injectTestWallet(page);
			await page.goto(route, { waitUntil: "domcontentloaded" });
			await page.waitForLoadState("networkidle");
			await expectAppShell(page);
		});
	});
}
