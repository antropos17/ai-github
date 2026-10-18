import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { createTestSystem } from "./harness.mjs";
async function until(check) {
  for (let i = 0; i < 250; i++) {
    await new Promise((r) => setTimeout(r, 20));
    if (check()) return;
  }
  throw new Error("DOM state did not settle");
}

test("React workspace preserves reading state, completes the scenario, and supports accounts and rankings", async (t) => {
  const system = await createTestSystem();
  t.after(() => system.close());
  const html = await readFile("dist/index.html", "utf8");
  const entry = html.match(/src="([^"]+\.js)"/)[1];
  const script = await readFile("dist" + entry, "utf8");
  const errors = [];
  const console = new VirtualConsole();
  console.on("jsdomError", (e) => {
    if (!e.message.includes("Not implemented")) errors.push(e.message);
  });
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: console,
  });
  const { window } = dom,
    doc = window.document;
  t.after(() => window.close());
  let offline = false,
    cookie = "",
    position = 0;
  Object.defineProperty(window, "scrollY", { get: () => position });
  window.scrollTo = (options, y) => {
    position = typeof options === "object" ? options.top : y;
  };
  window.scrollBy = ({ top }) => {
    position += top;
  };
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  window.fetch = async (url, options = {}) => {
    if (offline) throw new Error("offline");
    const result = await system.gateway.inject({
      url: String(url),
      method: options.method || "GET",
      payload: options.body,
      headers: { host: "localhost", cookie, ...options.headers },
    });
    if (result.headers["set-cookie"])
      cookie = String(result.headers["set-cookie"]).split(";")[0];
    return new Response(result.body, {
      status: result.statusCode,
      headers: result.headers,
    });
  };
  async function assertAccessible() {
    if (!window.axe) window.eval(axe.source);
    const result = await window.axe.run(doc, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      rules: { "color-contrast": { enabled: false } },
    });
    assert.equal(
      result.violations.length,
      0,
      JSON.stringify(result.violations),
    );
  }
  window.eval(script);
  await until(
    () => doc.querySelector("h1")?.textContent === "Workspace overview",
  );
  assert.equal(doc.documentElement.lang, "en");
  assert.equal(/[А-Яа-яЁё]/.test(doc.body.textContent), false);
  const source = doc.querySelector(".code-scroller"),
    line = source.querySelector("code");
  source.scrollLeft = 140;
  doc.querySelector(".cycle-details").open = true;
  const event = doc.querySelector("[data-event]"),
    link = event.querySelector("a");
  link.focus();
  const range = doc.createRange();
  range.selectNodeContents(line);
  window.getSelection().addRange(range);
  const selected = window.getSelection().toString();
  position = 320;
  const mobile = doc.querySelector("#mobile-navigation");
  mobile.value = "history";
  mobile.dispatchEvent(new window.Event("change", { bubbles: true }));
  doc.querySelector("#sync").click();
  await until(() => !doc.querySelector("#sync").disabled);
  assert.equal(doc.querySelector(".code-scroller"), source);
  assert.equal(source.scrollLeft, 140);
  assert.equal(window.getSelection().toString(), selected);
  assert.equal(doc.activeElement, link);
  assert.equal(doc.querySelector(".cycle-details").open, true);
  assert.equal(position, 320);
  assert.equal(mobile.value, "history");
  doc.querySelector("#playback-next").click();
  await until(
    () => doc.querySelector("#playback-status").textContent === "Step 1 / 10",
  );
  assert.equal(
    doc.querySelector('[data-event="' + event.dataset.event + '"]'),
    event,
  );
  assert.equal(doc.querySelector(".code-scroller"), source);
  assert.equal(source.scrollLeft, 140);
  assert.equal(position, 320);
  const theme = doc.querySelector("#theme-select");
  theme.value = "dark";
  theme.dispatchEvent(new window.Event("change", { bubbles: true }));
  await until(() => doc.documentElement.dataset.theme === "dark");
  assert.equal(doc.querySelector(".code-scroller"), source);
  assert.equal(window.localStorage.getItem("commit-zero-theme"), "dark");
  mobile.value = "agents";
  mobile.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.location.hash, "");
  doc
    .querySelector(".mobile-navigation")
    .dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  await until(() => doc.querySelector("h1")?.textContent === "Agents");
  assert.equal(position, 0);
  window.location.hash = "/home";
  await until(
    () => doc.querySelector("h1")?.textContent === "Workspace overview",
  );
  assert.equal(position, 320);
  const returningSource = doc.querySelector(".code-scroller");
  offline = true;
  doc.querySelector("#playback-next").click();
  await until(() => Boolean(doc.querySelector(".workspace-error")));
  assert.ok(doc.querySelector(".activity-feed"));
  assert.equal(doc.querySelector(".code-scroller"), returningSource);
  offline = false;
  doc.querySelector(".workspace-error button").click();
  await until(() => !doc.querySelector(".workspace-error"));
  for (let i = 1; i < 10; i++) {
    doc.querySelector("#playback-next").click();
    await until(
      () =>
        doc.querySelector("#playback-status").textContent ===
        `Step ${i + 1} / 10`,
    );
  }
  window.location.hash = "/agent/gemini/memory";
  await until(() => Boolean(doc.querySelector(".memory-item")));
  assert.match(
    doc.querySelector(".memory-item").textContent,
    /Pull request #12/,
  );
  window.location.hash = "/repo/orbit";
  await until(() => Boolean(doc.querySelector(".file-list")));
  assert.match(doc.querySelector(".code-lines").textContent, /Math.max/);
  assert.equal(
    doc.querySelector(".code-scroller").getAttribute("role"),
    "region",
  );
  const hash = window.location.hash;
  doc.querySelector(".skip").click();
  assert.equal(window.location.hash, hash);
  assert.equal(doc.activeElement, doc.querySelector("main"));
  assert.match(
    doc.querySelector(".file-list a[aria-current]").textContent,
    /orbit.js/,
  );
  window.location.hash = "/pr/12/files";
  await until(() => Boolean(doc.querySelector(".diff-add")));
  assert.match(doc.querySelector(".diff-add .sr").textContent, /Added/);
  assert.match(doc.querySelector(".diff-del .sr").textContent, /Removed/);
  window.location.hash = "/leaderboard";
  await until(
    () => doc.querySelectorAll(".ranking-table tbody tr").length === 3,
  );
  assert.match(
    doc.querySelector(".ranking-method").textContent,
    /No invented Elo/,
  );
  await assertAccessible();
  window.location.hash = "/signup";
  await until(() => Boolean(doc.querySelector(".auth-card input")));
  await assertAccessible();
  const form = doc.querySelector(".auth-card");
  form.elements.username.value = "react_observer";
  form.elements.password.value = "A-local-test-password";
  form.elements.displayName.value = "React Observer";
  form.dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true }),
  );
  await until(() => Boolean(doc.querySelector(".observer-profile")));
  assert.equal(doc.querySelector("h1").textContent, "React Observer");
  window.location.hash = "/repo/orbit";
  await until(() => Boolean(doc.querySelector(".repo-header")));
  const save = [...doc.querySelectorAll(".repo-header button")].find(
    (b) => b.textContent === "Save",
  );
  save.click();
  await until(() => save.textContent === "Saved");
  window.location.hash = "/profile";
  await until(() => Boolean(doc.querySelector(".repo-catalog")));
  assert.match(
    doc.querySelector(".repo-catalog").textContent,
    /chatgpt\/orbit/,
  );
  [...doc.querySelectorAll(".profile-tabs button")]
    .find((b) => b.textContent === "Edit profile")
    .click();
  await until(() => Boolean(doc.querySelector(".profile-form")));
  await assertAccessible();
  const profile = doc.querySelector(".profile-form");
  profile.elements.displayName.value = "Updated React Observer";
  profile.elements.biography.value = "Saved through the identity service.";
  profile.dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true }),
  );
  await until(
    () => doc.querySelector("h1").textContent === "Updated React Observer",
  );
  [...doc.querySelectorAll("button")]
    .find((b) => b.textContent === "Sign out")
    .click();
  await until(() => Boolean(doc.querySelector(".profile-welcome")));
  window.location.hash = "/login";
  await until(() => Boolean(doc.querySelector(".auth-card input")));
  const login = doc.querySelector(".auth-card");
  login.elements.username.value = "react_observer";
  login.elements.password.value = "A-local-test-password";
  login.dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true }),
  );
  await until(
    () => doc.querySelector("h1")?.textContent === "Updated React Observer",
  );
  window.location.hash = "/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E";
  await until(() => doc.querySelector("h1")?.textContent.startsWith("Search"));
  assert.equal(doc.querySelector("main img[onerror]"), null);
  window.location.hash = "/sandbox";
  await until(() => Boolean(doc.querySelector(".service-list")));
  assert.match(doc.querySelector(".service-list").textContent, /identity/);
  window.location.hash = "/home";
  await until(
    () => doc.querySelector("h1")?.textContent === "Workspace overview",
  );
  window.eval(axe.source);
  const result = await window.axe.run(doc, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  assert.equal(result.violations.length, 0, JSON.stringify(result.violations));
  window.location.hash = "/repo/orbital-garden";
  await until(() => Boolean(doc.querySelector(".code-lines")));
  position = 640;
  doc.querySelector("#playback-toggle").click();
  await until(
    () =>
      doc.querySelector("h1")?.textContent === "Workspace overview" &&
      doc.querySelector("#playback-status").textContent === "Step 0 / 10",
  );
  assert.equal(position, 0);
  assert.deepEqual(errors, []);
});
