import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { connectDatabase } from "../server/database.mjs";
import { createApp } from "../server/app.mjs";

async function until(check) {
  for (let i = 0; i < 150; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("DOM state did not settle");
}
test("Compiled interface loads, saves, recovers, navigates, and has accessible markup", async (t) => {
  const db = await connectDatabase({ memory: true, url: null });
  const app = await createApp({ db });
  t.after(() => app.close());
  const html = await readFile("dist/index.html", "utf8");
  const entry = html.match(/src="([^"]+\.js)"/)[1];
  const script = await readFile("dist" + entry, "utf8");
  let offline = false;
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => {
    if (!e.message.includes("Not implemented")) errors.push(e.message);
  });
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1:4173/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  t.after(() => window.close());
  window.fetch = async (url, options = {}) => {
    if (offline) throw new Error("offline");
    const result = await app.inject({
      method: options.method || "GET",
      url: String(url),
      payload: options.body,
      headers: { host: "127.0.0.1:4173", ...options.headers },
    });
    return new Response(result.body, {
      status: result.statusCode,
      headers: result.headers,
    });
  };
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  window.scrollTo = () => {};
  window.eval(script);
  const doc = window.document;
  await until(() => doc.querySelector("h1")?.textContent === "Обзор среды");
  assert.match(doc.querySelector("#connection-label").textContent, /Сохранено/);
  doc.querySelector("#playback-next").click();
  await until(
    () => doc.querySelector("#playback-status").textContent === "Шаг 1 / 10",
  );
  assert.equal(
    (
      await app.inject({ url: "/api/state", headers: { host: "localhost" } })
    ).json().step,
    1,
  );
  offline = true;
  doc.querySelector("#playback-next").click();
  await until(() => !doc.querySelector("#connection-error").hidden);
  assert.match(doc.querySelector("#connection-error").textContent, /Нет связи/);
  assert.equal(doc.querySelector("#playback-next").disabled, true);
  assert.ok(doc.querySelector(".activity-feed"));
  offline = false;
  doc.querySelector("#retry").click();
  await until(() => doc.querySelector("#connection-error").hidden);
  assert.equal(doc.querySelector("#playback-status").textContent, "Шаг 1 / 10");
  for (let i = 1; i < 10; i++) {
    doc.querySelector("#playback-next").click();
    await until(
      () =>
        doc.querySelector("#playback-status").textContent ===
        (i === 9 ? "Цикл завершён" : `Шаг ${i + 1} / 10`),
    );
  }
  window.location.hash = "/agent/gemini/memory";
  await until(() => Boolean(doc.querySelector(".memory-item")));
  assert.match(
    doc.querySelector(".memory-item").textContent,
    /Pull request #12/,
  );
  window.location.hash = "/repo/orbit";
  await until(() => Boolean(doc.querySelector(".code-lines")));
  assert.match(doc.querySelector(".code-lines").textContent, /Math.max/);
  assert.equal(doc.activeElement, doc.querySelector("main"));
  const input = doc.querySelector("#search-input");
  input.value = "<img src=x onerror=alert(1)>";
  doc
    .querySelector("#search-form")
    .dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  await until(() => doc.querySelector("h1")?.textContent.startsWith("Поиск"));
  assert.equal(doc.querySelector("main img[onerror]"), null);
  window.location.hash = "/home";
  await until(() => Boolean(doc.querySelector(".activity-feed")));
  window.eval(axe.source);
  const result = await window.axe.run(doc, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  assert.equal(
    result.violations.length,
    0,
    JSON.stringify(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  );
  window.location.hash = "/repo/orbital-garden";
  await until(() => Boolean(doc.querySelector(".code-lines")));
  doc.querySelector("#playback-toggle").click();
  await until(
    () =>
      doc.querySelector("h1")?.textContent === "Обзор среды" &&
      doc.querySelector("#playback-status").textContent === "Готово к показу",
  );
  const fresh = (
    await app.inject({ url: "/api/state", headers: { host: "localhost" } })
  ).json();
  assert.equal(fresh.runs.length, 2);
  await app.inject({
    method: "POST",
    url: "/api/advance",
    headers: { host: "localhost", "x-commit-zero": "local-demo" },
    payload: { runId: fresh.runId, version: fresh.version },
  });
  doc.querySelector("#playback-next").click();
  await until(
    () =>
      doc.querySelector("#connection-label").textContent ===
      "Версия изменилась",
  );
  assert.equal(doc.querySelector("#playback-status").textContent, "Шаг 1 / 10");
  doc.querySelector("#retry").click();
  await until(() => doc.querySelector("#connection-error").hidden);
  assert.deepEqual(errors, []);
});
