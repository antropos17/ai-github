import { build } from "vite";
import { cp, rename } from "node:fs/promises";
import config from "../vite.config.mjs";
await build({ ...config, configFile: false });
await rename("dist/social.html", "dist/index.html");
for (const name of ["play.html", "play.js", "garden.html", "garden.js"])
  await cp("prototype/" + name, "dist/" + name);
await cp("prototype/assets", "dist/assets", { recursive: true });
