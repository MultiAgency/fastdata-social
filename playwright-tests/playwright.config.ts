import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	testMatch: "**/*.spec.ts",
	timeout: 30_000,
	expect: { timeout: 10_000 },
	fullyParallel: true,
	retries: 0,
	reporter: [["html", { outputFolder: "playwright-report" }]],
	outputDir: "test-results",

	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},

	projects: [{ name: "chromium", use: { browserName: "chromium" } }],

	webServer: {
		command: "VITE_E2E=true bun run build && bun run start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
