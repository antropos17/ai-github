import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("React scenario, persistent state, games, rankings, keyboard and narrow layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/home");
  await expect(
    page.getByRole("heading", { name: "Workspace overview", exact: true }),
  ).toBeVisible();
  for (let step = 1; step <= 10; step++) {
    await page.getByRole("button", { name: "Next step", exact: true }).click();
    await expect(page.locator("#playback-status")).toHaveText(
      `Step ${step} / 10`,
    );
  }
  await page.reload();
  await expect(page.locator("#playback-status")).toHaveText("Step 10 / 10");
  await page
    .getByRole("link", { name: "View the new project", exact: true })
    .click();
  await page.getByRole("button", { name: "Open preview", exact: true }).click();
  await page
    .getByRole("button", { name: "Plant a satellite", exact: true })
    .click();
  await expect(page.locator(".game-score")).toHaveText("4 / 12 satellites");
  await page
    .getByRole("button", { name: "Plant a satellite", exact: true })
    .press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open preview", exact: true }),
  ).toBeFocused();
  await page.locator('[data-nav="leaderboard"]').click();
  await expect(page.locator(".ranking-table tbody tr")).toHaveCount(3);
  for (const theme of ["light", "dark"]) {
    await page
      .getByRole("combobox", { name: "Color theme" })
      .selectOption(theme);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(navigation.locator("a")).toHaveCount(14);
  await expect(navigation.locator("details, select")).toHaveCount(0);
  await navigation
    .getByRole("link", { name: "My profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your profile", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Observer registration, profile changes, bookmarks, session persistence and logout", async ({
  page,
}) => {
  await page.goto("/#/signup");
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Browser Observer");
  await page.getByLabel("Username", { exact: true }).fill("browser_observer");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Local-browser-test-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Observer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Bio", { exact: true }).fill("Following shared tools.");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile saved." }),
  ).toBeVisible();
  await page.locator('.directory-link > a[href="#/repo/orbit"]').click();
  let blocked = true;
  await page.route("**/api/account/bookmarks/orbit", (route) => {
    if (!blocked) return route.continue();
    blocked = false;
    return route.fulfill({ status: 429, contentType: "application/json",
      body: JSON.stringify({ message: "Rate limit exceeded." }) });
  });
  const limited = page.waitForResponse((response) =>
    response.url().endsWith("/api/account/bookmarks/orbit") &&
    response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await limited).status()).toBe(429);
  await expect(page.getByRole("alert")).toContainText("Too many requests");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const errorAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(errorAxe.violations).toEqual([]);
  if (process.env.CZ_CAPTURE_BROWSER === "1") {
    await mkdir("runtime/verification", { recursive: true });
    await page.screenshot({ path: "runtime/verification/bookmark-rate-limit-narrow-2026-10-19.png" });
  }
  const bookmark = page.waitForResponse((response) =>
    response.url().endsWith("/api/account/bookmarks/orbit") &&
    response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await bookmark).status()).toBe(200);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.locator('[data-nav="profile"]').click();
  await expect(page.locator(".repo-catalog")).toContainText("chatgpt/orbit");
  await page.reload();
  await expect(page.locator(".bio")).toHaveText("Following shared tools.");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your profile", exact: true }),
  ).toBeVisible();
  await page
    .locator(".profile-welcome")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill("browser_observer");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Local-browser-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Observer", exact: true }),
  ).toBeVisible();
});

// Keep these reads outside the Commons write/recovery group's ordinary API limit.
for (const viewport of [{ width: 504, height: 871, top: 400 }, { width: 1440, height: 900, top: 80 }])
test(`project sections keep the viewport and browser history restores reading at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto("/#/commons/safe-timer");
  const task = page.getByLabel("Task", { exact: true });
  const sections = page.getByRole("group", { name: "Project sections" });
  await expect(page.getByRole("heading", { name: "safe-timer", exact: true })).toBeVisible();
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), viewport.top);
  const original = await page.evaluate(() => window.scrollY);
  expect(original).toBeGreaterThan(viewport.top - 5);
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(task).toBeVisible();
  await expect(task).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(original, 0);
  await task.fill("A draft must not move the surrounding workspace.");
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), viewport.width < 1000 ? 620 : 0);
  const composerPosition = await page.evaluate(() => window.scrollY);
  expect(Math.abs(composerPosition - original)).toBeGreaterThan(50);
  await page.goBack();
  await expect(page).toHaveURL(/#\/commons\/safe-timer$/);
  await expect(sections.getByRole("button", { name: "Code", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(original, 0);
  await page.goForward();
  await expect(task).toHaveValue("A draft must not move the surrounding workspace.");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(composerPosition, 0);
  await page.getByRole("button", { name: "Back to Code", exact: true }).click();
  await expect(sections.getByRole("button", { name: "Code", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(original, 0);
  await sections.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.getByRole("region", { name: "Chat", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(original, 0);
  await expect(sections.getByRole("button", { name: "Chat", exact: true })).toBeFocused();
});
