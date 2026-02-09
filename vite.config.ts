import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [nodePolyfills(), tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          router: ["@tanstack/react-router"],
          near: ["near-kit", "@near-kit/react", "@hot-labs/near-connect"],
        },
      },
    },
  },
});
