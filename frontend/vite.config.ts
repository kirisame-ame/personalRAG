import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5300,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://backend:5200",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      host: "localhost",
      clientPort: 5300,
      port: 5300,
    },
  },
});
