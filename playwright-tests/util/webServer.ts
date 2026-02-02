/** Web server configuration for Playwright tests. */
export const webServerConfig = {
	command: "bun run build && bun run start",
	url: "http://localhost:3000",
	reuseExistingServer: !process.env.CI,
	timeout: 120_000,
} as const;
