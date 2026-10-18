import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import { resolve } from "node:path";
import { connectDatabase } from "./database.mjs";
import { WorkspaceStore } from "./store.mjs";

export async function createApp({ db, staticRoot, logger = false } = {}) {
  db ||= await connectDatabase();
  const app = Fastify({ logger, bodyLimit: 4096 });
  const store = new WorkspaceStore(db);
  await store.initialize();
  app.addHook("onClose", () => db.close());
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  app.addHook("onRequest", async (request, reply) => {
    if (!["127.0.0.1", "localhost", "[::1]"].includes(request.hostname))
      return reply.code(403).send({ message: "Local access only." });
    if (request.url.startsWith("/api/"))
      reply.header("Cache-Control", "no-store");
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "same-origin");
    if (request.method === "POST") {
      const origin = request.headers.origin;
      if (origin && origin !== `http://${request.headers.host}`)
        return reply.code(403).send({ message: "Origin is not permitted." });
      if (request.headers["x-commit-zero"] !== "local-demo")
        return reply
          .code(403)
          .send({ message: "Missing local operator header." });
    }
  });
  const state = async () => ({
    ...(await store.read()),
    databaseMode: db.mode,
  });
  app.get("/api/health", async () => {
    await db.query("SELECT 1");
    return { status: "ok", database: db.mode, mode: "simulation", schema: 1 };
  });
  app.get("/api/state", state);
  app.get("/api/export", async (_request, reply) => {
    reply.header(
      "Content-Disposition",
      'attachment; filename="commit-zero.json"',
    );
    return {
      format: 1,
      exportedAt: new Date().toISOString(),
      state: await state(),
    };
  });
  app.get(
    "/api/runs/:id/export",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" } },
        },
      },
    },
    async (request, reply) => {
      reply.header(
        "Content-Disposition",
        `attachment; filename="commit-zero-${request.params.id}.json"`,
      );
      return {
        format: 1,
        exportedAt: new Date().toISOString(),
        state: await store.read(request.params.id),
      };
    },
  );
  const schema = {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["runId", "version"],
      properties: {
        runId: { type: "string", format: "uuid" },
        version: { type: "integer", minimum: 0 },
      },
    },
  };
  app.post("/api/advance", { schema }, async (request) => ({
    ...(await store.change(request.body)),
    databaseMode: db.mode,
  }));
  app.post("/api/runs", { schema }, async (request) => ({
    ...(await store.change(request.body, true)),
    databaseMode: db.mode,
  }));
  if (staticRoot)
    await app.register(fastifyStatic, {
      root: resolve(staticRoot),
      index: "index.html",
      dotfiles: "deny",
    });
  app.setErrorHandler((error, request, reply) => {
    if (error.validation)
      return reply.code(400).send({ message: "Invalid request." });
    const code = error.statusCode || 500;
    if (code >= 500) request.log.error({ err: error }, "Request failed");
    return reply
      .code(code)
      .send({
        message:
          code === 409
            ? error.message
            : code >= 500
              ? "Server could not complete the request."
              : error.message,
      });
  });
  return app;
}
