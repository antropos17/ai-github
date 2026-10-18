import { createApp } from "../server/app.mjs";
import { connectDatabase } from "../server/database.mjs";
import {
  createIdentityApp,
  identityDatabase,
} from "../services/identity/app.mjs";
import { createRankingApp } from "../services/ranking/app.mjs";
import { createGateway } from "../services/gateway.mjs";

export async function createTestSystem({ staticRoot } = {}) {
  const workspace = await createApp({
    db: await connectDatabase({ memory: true, url: null }),
  });
  const identity = await createIdentityApp({
    db: await identityDatabase({ memory: true, url: null }),
  });
  const ranking = await createRankingApp({
    loadContributions: async () =>
      (
        await workspace.inject({
          url: "/api/contributions",
          headers: { host: "localhost" },
        })
      ).json(),
  });
  const apps = { workspace, identity, ranking };
  const gateway = await createGateway({
    services: Object.fromEntries(
      Object.keys(apps).map((name) => [name, `http://${name}`]),
    ),
    staticRoot,
    transport: async (url, options = {}) => {
      const parsed = new URL(url);
      const result = await apps[parsed.hostname].inject({
        url: parsed.pathname + parsed.search,
        method: options.method || "GET",
        payload: options.body,
        headers: { host: "localhost", ...options.headers },
      });
      return new Response(result.body || null, {
        status: result.statusCode,
        headers: result.headers,
      });
    },
  });
  return {
    gateway,
    workspace,
    identity,
    ranking,
    async close() {
      await gateway.close();
      await Promise.all(Object.values(apps).map((app) => app.close()));
    },
  };
}
