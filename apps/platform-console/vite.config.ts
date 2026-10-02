import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom", "react-router-dom"] },
  optimizeDeps: {
    exclude: [
      "@housekit/ui",
      "@housekit/api-client",
      "@housekit/auth",
      "@housekit/i18n",
      "@housekit/app-kit",
    ],
  },
  server: { port: 5176, host: true },
});
