import { resolve } from "node:path";
export default {
  root: resolve("prototype"),
  publicDir: false,
  cacheDir: resolve(".cache/vite"),
  plugins: [
    {
      name: "workspace-entry",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url === "/" || request.url === "/index.html")
            request.url = "/social.html";
          next();
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:4174" },
    fs: { strict: true },
  },
  build: {
    outDir: resolve("dist"),
    emptyOutDir: true,
    rollupOptions: { input: resolve("prototype/social.html") },
  },
};
