import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("model-free first run creates and retains project, issue, and discussion", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/discover");
  await page.getByRole("link", { name: "Open workspace", exact: true }).click();
  await expect(page.getByRole("group", { name: "Project sections" })
    .getByRole("button", { name: "Projects", exact: true })).toHaveAttribute("aria-pressed", "true");
  const form = page.getByRole("region", { name: "New project" });
  await form.getByLabel("Project address").fill("browser-first-run");
  await form.getByLabel("Project name").fill("Browser First Run");
  await form.getByLabel("Description").fill("A disposable project created without model inference.");
  await form.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/#\/commons\/browser-first-run$/);
  await expect(page.getByRole("heading", { name: "Browser First Run", exact: true })).toBeVisible();
  await page.getByRole("group", { name: "Project sections" })
    .getByRole("button", { name: /^Tasks/ }).click();
  await page.getByRole("button", { name: "Create first task", exact: true }).click();
  await expect(page.getByRole("region", { name: "New task" })).toBeVisible();
  await expect(page.getByLabel("Task", { exact: true })).toBeFocused();
  await page.getByRole("group", { name: "Project sections" })
    .getByRole("button", { name: /Issues/ }).click();
  await page.getByLabel("Issue title").fill("Handle empty input");
  await page.getByLabel("Problem and expected behavior")
    .fill("An empty argument should return a bounded error rather than throwing.");
  await page.getByRole("button", { name: "Open issue" }).click();
  await expect(page.getByRole("heading", { name: /#1 Handle empty input/ })).toBeVisible();
  await page.getByRole("button", { name: "Create task from issue" }).click();
  await expect(page.getByRole("region", { name: "New task" })).toContainText("Issue #1: Handle empty input");
  await expect(page.getByLabel("Task", { exact: true }))
    .toHaveValue("Investigate and resolve issue #1: Handle empty input");
  await expect(page.getByRole("button", { name: "Run agents", exact: true })).toBeDisabled();
  await page.getByRole("group", { name: "Project sections" })
    .getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByLabel("Message", { exact: true }).fill("A model-free project discussion.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("region", { name: "Saved messages" }))
    .toContainText("A model-free project discussion.");
  const desktopAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(desktopAxe.violations).toEqual([]);
  if (process.env.CZ_CAPTURE_BROWSER === "1") {
    await mkdir("runtime/verification", { recursive: true });
    await page.screenshot({ path: "runtime/verification/commons-first-run-desktop-2026-10-19.png" });
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Browser First Run", exact: true })).toBeVisible();
  await page.getByRole("group", { name: "Project sections" })
    .getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.getByRole("region", { name: "Saved messages" }))
    .toContainText("A model-free project discussion.");
  await page.getByRole("group", { name: "Project sections" })
    .getByRole("button", { name: /Issues/ }).click();
  await expect(page.getByRole("heading", { name: /#1 Handle empty input/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const narrowAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(narrowAxe.violations).toEqual([]);
  if (process.env.CZ_CAPTURE_BROWSER === "1") {
    await page.screenshot({ path: "runtime/verification/commons-first-run-narrow-2026-10-19.png", fullPage: true });
  }
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("dark");
  const darkAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(darkAxe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if (process.env.CZ_CAPTURE_BROWSER === "1") {
    await page.screenshot({ path: "runtime/verification/commons-first-run-narrow-dark-2026-10-19.png", fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("two tabs recover a stale Commons write without losing the draft", async ({ page, context }) => {
  await page.goto("/#/commons/safe-timer?view=discussion");
  const second = await context.newPage();
  await second.goto("/#/commons/safe-timer?view=discussion");
  await expect(second.getByRole("heading", { name: "safe-timer", exact: true })).toBeVisible();
  await second.getByRole("button", { name: "Pause updates" }).click();
  await second.getByLabel("Message", { exact: true }).fill("Second tab keeps this draft after a conflict.");

  await page.getByLabel("Message", { exact: true }).fill("First tab commits a competing edit.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("region", { name: "Saved messages" }))
    .toContainText("First tab commits a competing edit.");

  const stale = second.waitForResponse((response) =>
    response.url().endsWith("/api/commons/messages") &&
    response.request().method() === "POST",
  );
  await second.getByRole("button", { name: "Send", exact: true }).click();
  expect((await stale).status()).toBe(409);
  await expect(second.getByLabel("Message", { exact: true }))
    .toHaveValue("Second tab keeps this draft after a conflict.");
  await expect(second.getByRole("alert")).toBeVisible();
  await expect(second.getByRole("button", { name: "Send", exact: true })).toBeEnabled();

  const retry = second.waitForResponse((response) =>
    response.url().endsWith("/api/commons/messages") &&
    response.request().method() === "POST",
  );
  await second.getByRole("button", { name: "Send", exact: true }).click();
  expect((await retry).status()).toBe(200);
  await expect(second.getByRole("region", { name: "Saved messages" }))
    .toContainText("Second tab keeps this draft after a conflict.");
  await second.close();
});

test("a delayed successful Send preserves the next message being written", async ({ page }) => {
  await page.goto("/#/commons/safe-timer?view=discussion");
  await page.getByRole("button", { name: "Pause updates", exact: true }).click();
  const message = page.getByLabel("Message", { exact: true });
  const saved = page.getByRole("region", { name: "Saved messages", exact: true });
  const submittedText = "Save this first message while the next message is being written.";
  const nextDraft = "Keep this newer message in the composer after the earlier Send finishes.";
  let release, submitted;
  const gate = new Promise((resolve) => { release = resolve; });
  const committed = new Promise((resolve) => { submitted = resolve; });
  await page.route("**/api/commons/messages", async (route) => {
    // Exercise a real persisted write, holding only its response to the browser.
    const response = await route.fetch();
    submitted(response.status());
    await gate;
    await route.fulfill({ response });
  });
  try {
    await message.fill(submittedText);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    expect(await committed).toBe(200);
    await expect(page.getByRole("form", { name: "Send message" })).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "Sending message…" })).toBeVisible();
    await message.fill(nextDraft);
    const received = page.waitForResponse((response) =>
      response.url().endsWith("/api/commons/messages") && response.request().method() === "POST",
    );
    release();
    expect((await received).status()).toBe(200);
    await expect(saved).toContainText(submittedText);
    await expect(page.getByRole("form", { name: "Send message" })).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("status").filter({ hasText: "Message sent" })).toBeVisible();
    await expect(message).toHaveValue(nextDraft);
    await expect(message).toBeFocused();
    await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("a failed Send retains the current edited message and keyboard focus", async ({ page }) => {
  await page.goto("/#/commons/safe-timer?view=discussion");
  await page.getByRole("button", { name: "Pause updates", exact: true }).click();
  const message = page.getByLabel("Message", { exact: true });
  const currentDraft = "This edited message must remain available after the connection fails.";
  let release, started;
  const gate = new Promise((resolve) => { release = resolve; });
  const pending = new Promise((resolve) => { started = resolve; });
  await page.route("**/api/commons/messages", async (route) => {
    started();
    await gate;
    await route.abort("failed");
  });
  try {
    await message.fill("The original message will encounter a connection failure.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await pending;
    await message.fill(currentDraft);
    release();
    await expect(page.getByRole("alert").filter({ hasText: "Cannot reach the service." })).toBeVisible();
    await expect(page.getByRole("form", { name: "Send message" }).getByRole("alert"))
      .toContainText("Cannot reach the service.");
    await expect(message).toHaveValue(currentDraft);
    await expect(message).toBeFocused();
    await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
    await expect(page.getByRole("region", { name: "Saved messages", exact: true })).not.toContainText(currentDraft);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("workspace separates reading from task creation and retains the draft across sections", async ({ page }) => {
  const writes = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  // Readiness metadata only; this journey never submits a task or starts inference.
  await page.route("**/api/commons/provider", (route) =>
    route.fulfill({ json: { available: true, busy: false } }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/commons/safe-timer");
  const sections = page.getByRole("group", { name: "Project sections" });
  const composer = page.getByRole("region", { name: "New task", exact: true });
  const task = page.getByLabel("Task", { exact: true });
  await expect(page.getByRole("navigation", { name: "Project location" }))
    .toContainText("All projects / safe-timer");
  await expect(page.getByRole("region", { name: "Source code", exact: true })).toBeVisible();
  await expect(composer).toBeHidden();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page).toHaveURL(/view=compose$/);
  await expect(composer).toBeVisible();
  await expect(composer).toContainText("Project: safe-timer");
  await expect(task).toBeFocused();
  const draft = "Keep this task draft while I inspect the project.";
  await task.fill(draft);
  await page.getByRole("button", { name: "Back to Code", exact: true }).click();
  await expect(composer).toBeHidden();
  await expect(sections.getByRole("button", { name: "Code", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(task).toHaveValue(draft);
  await expect(task).toBeFocused();
  await sections.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page).toHaveURL(/view=discussion$/);
  await expect(composer).toBeHidden();
  await page.reload();
  await expect(page.getByRole("region", { name: "Chat", exact: true })).toBeVisible();
  await expect(sections.getByRole("button", { name: "Chat", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "All projects", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page.getByLabel("Project address", { exact: true })).toBeFocused();
  await sections.getByRole("button", { name: "General chat", exact: true }).click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  const project = page.getByLabel("Project", { exact: true });
  const run = page.getByRole("button", { name: "Run agents", exact: true });
  await expect(project).toHaveValue("");
  await expect(run).toBeDisabled();
  await project.selectOption("safe-timer");
  await expect(run).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Color theme", { exact: true }).selectOption(theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(sections.getByRole("button", { name: "General chat", exact: true })).toBeAttached();
    expect((await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
  expect(writes).toEqual([]);
});

for (const chooseAnotherInput of [false, true]) {
test(`manual Commons retry ${chooseAnotherInput ? "respects another chosen input" : "restores keyboard entry without scrolling"}`, async ({ page }) => {
  // Freeze polling timers so this journey proves the explicit retry action.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  let attempts = 0, release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/commons?runId=*", async (route) => {
    if (++attempts === 1) return route.abort("failed");
    await gate;
    return route.continue();
  });
  try {
    await page.goto("/#/commons/safe-timer");
    const failure = page.getByRole("alert").filter({ hasText: "Cannot reach the service." });
    await expect(failure).toBeVisible();
    const section = page.locator("main section[aria-busy]");
    await expect(section).toHaveAttribute("aria-busy", "false");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const retry = page.getByRole("button", { name: "Retry", exact: true });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(section).toHaveAttribute("aria-busy", "true");
    await expect(retry).toBeDisabled();
    expect(attempts).toBe(2);
    const search = page.getByRole("searchbox", { name: "Search agents, repositories, and pull requests", exact: true });
    if (chooseAnotherInput) await search.fill("Keep this search draft during recovery");
    const readingPosition = await page.evaluate(() => window.scrollY);
    const recovered = page.waitForResponse((response) => response.url().includes("/api/commons?runId=") && response.status() === 200);
    release();
    await recovered;
    await expect(page.getByRole("heading", { name: "safe-timer", exact: true })).toBeVisible();
    await expect(retry).toHaveCount(0);
    await expect(chooseAnotherInput ? search : page.getByRole("main")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(readingPosition, 0);
    if (chooseAnotherInput) await expect(search).toHaveValue("Keep this search draft during recovery");
    await page.clock.resume();
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations).toEqual([]);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
}
