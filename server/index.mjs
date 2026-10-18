import { createApp } from "./app.mjs";
const app = await createApp({ staticRoot: "dist" });
await app.listen({ port: Number(process.env.PORT || 4173), host: "127.0.0.1" });
console.log(`Commit Zero: ${app.server.address().port} (loopback only)`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
