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
  let scrollPosition = 0;
  Object.defineProperty(window, "scrollY", { get: () => scrollPosition });
  window.scrollTo = (options, y) => {
    scrollPosition = typeof options === "object" ? options.top : y;
  };
  window.scrollBy = ({ top }) => {
    scrollPosition += top;
  };
  window.eval(script);
  const doc = window.document;
  await until(() => doc.querySelector("h1")?.textContent === "Обзор среды");
  assert.match(doc.querySelector("#connection-label").textContent, /Сохранено/);
  const codeScroller = doc.querySelector(".code-scroller");
  const themeControl = doc.querySelector("#theme-select");
  assert.ok(doc.querySelector(".brand-mark"));
  assert.ok(doc.querySelector(".fn"));
  for (const theme of ["dark", "light"]) {
    themeControl.value = theme;
    themeControl.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.equal(doc.documentElement.dataset.theme, theme);
    assert.equal(window.localStorage.getItem("commit-zero-theme"), theme);
    assert.equal(doc.querySelector(".code-scroller"), codeScroller);
  }
  window.dispatchEvent(
    new window.StorageEvent("storage", {
      key: "commit-zero-theme",
      newValue: "dark",
    }),
  );
  assert.equal(themeControl.value, "dark");
  themeControl.value = "light";
  themeControl.dispatchEvent(new window.Event("change", { bubbles: true }));

  // The synchronous bootstrap restores appearance before the stylesheet paints.
  const reloaded = new JSDOM(html, {
    url: "http://127.0.0.1:4173/",
    runScripts: "outside-only",
  });
  reloaded.window.matchMedia = () => ({ matches: false });
  reloaded.window.localStorage.setItem("commit-zero-theme", "dark");
  reloaded.window.eval(
    reloaded.window.document.querySelector("#theme-init").textContent,
  );
  assert.equal(reloaded.window.document.documentElement.dataset.theme, "dark");
  reloaded.window.matchMedia = () => ({ matches: true });
  Object.defineProperty(reloaded.window, "localStorage", {
    get() {
      throw new Error("storage blocked");
    },
  });
  assert.doesNotThrow(() =>
    reloaded.window.eval(
      reloaded.window.document.querySelector("#theme-init").textContent,
    ),
  );
  assert.equal(reloaded.window.document.documentElement.dataset.theme, "dark");
  reloaded.window.close();
  const existingEvent = doc.querySelector(".feed-item");
  const eventKey = existingEvent.dataset.key;
  const eventLink = existingEvent.querySelector("a");
  codeScroller.scrollLeft = 140;
  doc.querySelector(".cycle-details").open = true;
  eventLink.focus();
  const selection = window.getSelection();
  const range = doc.createRange();
  range.selectNodeContents(doc.querySelector(".code-line code"));
  selection.addRange(range);
  const selectedText = selection.toString();
  scrollPosition = 320;
  doc.querySelector("#sync").click();
  await until(
    () => doc.querySelector("main").getAttribute("aria-busy") === "false",
  );
  assert.equal(doc.querySelector(".code-scroller"), codeScroller);
  assert.equal(codeScroller.scrollLeft, 140);
  assert.equal(selection.toString(), selectedText);
  assert.equal(doc.activeElement, eventLink);
  assert.equal(scrollPosition, 320);
  doc.querySelector("#playback-next").click();
  await until(
    () => doc.querySelector("#playback-status").textContent === "Шаг 1 / 10",
  );
  assert.equal(doc.querySelector(`[data-key="${eventKey}"]`), existingEvent);
  assert.equal(doc.querySelector(".code-scroller"), codeScroller);
  assert.equal(codeScroller.scrollLeft, 140);
  assert.equal(doc.querySelector(".cycle-details").open, true);
  assert.equal(doc.activeElement, eventLink);
  window.location.hash = "/agents";
  await until(() => doc.querySelector("h1")?.textContent === "Агенты");
  assert.equal(scrollPosition, 0);
  window.location.hash = "/home";
  await until(() => Boolean(doc.querySelector(".activity-feed")));
  assert.equal(scrollPosition, 320);
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
  scrollPosition = 640;
  doc.querySelector("#playback-toggle").click();
  await until(
    () =>
      doc.querySelector("h1")?.textContent === "Обзор среды" &&
      doc.querySelector("#playback-status").textContent === "Готово к показу",
  );
  assert.equal(scrollPosition, 0);
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
