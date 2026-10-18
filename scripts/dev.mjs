import { createServer } from "vite";
import { createApp } from "../server/app.mjs";
import config from "../vite.config.mjs";
const api = await createApp();
try {
  await api.listen({
    port: Number(process.env.API_PORT || 4174),
    host: "127.0.0.1",
  });
  const web = await createServer({ ...config, configFile: false });
  await web.listen();
  console.log(
    "Commit Zero: http://127.0.0.1:4173/ | API: http://127.0.0.1:4174/api/health",
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, async () => {
      await web.close();
      await api.close();
      process.exit(0);
    });
} catch (error) {
  await api.close();
  throw error;
}
