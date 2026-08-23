import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Internal @housekit/* packages export raw TS; exclude them from pre-bundling so
// Vite transpiles their source, and dedupe React across the workspace.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    exclude: [
      "@housekit/ui",
      "@housekit/api-client",
      "@housekit/auth",
      "@housekit/i18n",
      "@housekit/app-kit",
    ],
  },
  server: { port: 5174 },
});
