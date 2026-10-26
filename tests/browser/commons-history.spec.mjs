import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("large saved chat reveals earlier messages without moving the reading anchor", async ({ page }) => {
  let snapshot;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const message = (index) => ({
    id: `heldout-history-${index}`, sequence: index,
    at: "2026-02-02T00:00:00.000Z", type: "message", actor: "operator",
    actorName: "Simulated history participant", repoId: "",
    text: `Held-out message ${index}: an independently sized history fixture.`,
  });
  await page.route("**/api/commons?**", async (route) => {
    if (!snapshot) {
      snapshot = await (await route.fetch()).json();
      snapshot.version = 1;
      snapshot.events = Array.from({ length: 147 }, (_, index) => message(index + 1));
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) });
  });
  await page.goto("/#/commons");
  const log = page.getByRole("region", { name: "Saved messages" });
  const messages = log.locator(".commons-message");
  await expect(messages).toHaveCount(40);
  await expect(messages.first()).toContainText("Held-out message 108:");
  await expect(messages.last()).toContainText("Held-out message 147:");
  await page.getByRole("button", { name: "Pause updates", exact: true }).click();
  snapshot.events.push(message(148)); snapshot.version++;
  await page.getByRole("button", { name: "Resume updates", exact: true }).click();
  await expect(messages.last()).toContainText("Held-out message 148:");
  await expect(messages).toHaveCount(40);
  const earlier = page.getByRole("button", { name: "Show 40 earlier messages", exact: true });
  await earlier.scrollIntoViewIfNeeded();
  await log.evaluate((element) => { element.scrollTop = 0; });
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(0);
  const retained = messages.first();
  const retainedText = await retained.locator("p").textContent();
  const anchor = log.getByText(retainedText, { exact: true });
  const before = await anchor.evaluate((element) => element.getBoundingClientRect().top);
  await earlier.click();
  await expect(messages).toHaveCount(80);
  const after = await anchor.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThan(2);
  await page.getByRole("button", { name: "Pause updates", exact: true }).click();
  snapshot.events.push(message(149)); snapshot.version++;
  await page.getByRole("button", { name: "Resume updates", exact: true }).click();
  await expect(messages).toHaveCount(81);
  await expect(messages.first()).toContainText("Held-out message 69:");
  await earlier.click();
  await expect(messages).toHaveCount(121);
  const finalEarlier = page.getByRole("button", { name: "Show 28 earlier messages", exact: true });
  await finalEarlier.focus();
  const finalAnchorText = await messages.first().locator("p").textContent();
  const finalAnchor = log.getByText(finalAnchorText, { exact: true });
  const finalBefore = await finalAnchor.evaluate((element) => element.getBoundingClientRect().top);
  await finalEarlier.press("Enter");
  await expect(messages).toHaveCount(149);
  await expect(log).toBeFocused();
  const finalAfter = await finalAnchor.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(finalAfter - finalBefore)).toBeLessThan(2);
  await expect(messages.first()).toContainText("Held-out message 1:");
  await expect(page.getByRole("button", { name: /earlier messages/ })).toHaveCount(0);
  await messages.first().getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("region", { name: "New task" })).toContainText("Held-out message 1:");
  await expect(page.getByRole("button", { name: "Run agents", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Back to General chat", exact: true }).click();
  await log.evaluate((element) => { element.scrollTop = 600; });
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(600);
  const sections = page.getByRole("group", { name: "Project sections" });
  await sections.getByRole("button", { name: /^Tasks/ }).click();
  await expect(log).toBeHidden();
  await sections.getByRole("button", { name: "General chat", exact: true }).click();
  await expect(log).toBeVisible();
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(600);
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.getByRole("region", { name: "New task" })).toContainText("Held-out message 1:");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("saved tasks distinguish finished calls from merge decisions and missing records", async ({ page }) => {
  let snapshot;
  await page.route("**/api/commons?**", async (route) => {
    if (!snapshot) {
      snapshot = await (await route.fetch()).json();
      const project = snapshot.projects.find((item) => item.id === "safe-timer");
      const path = Object.keys(project.files)[0];
      project.prs = [{
        id: "task-navigation-approved", jobId: "task-navigation-completed",
        title: "Recorded proposal awaiting operator review", path,
        before: project.files[path], after: project.files[path],
        baseRevision: project.revision, status: "approved",
        check: { passed: true }, hash: "browser-fixture-only",
        review: { message: "Model review is not runtime verification." },
      }];
      const job = {
        repoId: project.id, model: "browser-fixture-only", provenance: "mock",
        startedAt: "2026-10-23T08:00:00Z", responses: [],
      };
      snapshot.jobs = [
        {
          ...job, id: "task-navigation-completed", status: "completed",
          task: "Inspect the retained change before deciding whether to merge.",
          sourceMessageId: "task-navigation-source",
        },
        {
          ...job, id: "task-navigation-failed", status: "failed",
          task: "Inspect the recorded failure without starting another task.",
        },
      ];
      snapshot.events = [
        {
          id: "task-navigation-source", type: "message", actor: "operator",
          at: job.startedAt, repoId: project.id, sequence: 1,
          text: "Keep this original instruction visible with the task.",
        },
        {
          id: "task-navigation-failure", type: "failed", actor: "system",
          jobId: "task-navigation-failed", repoId: project.id, sequence: 2,
          at: "2026-10-23T08:01:00Z", text: "Fixture provider stopped before producing a proposal.",
        },
      ];
      snapshot.version += 100;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) });
  });
  await page.goto("/#/commons/safe-timer?view=tasks");
  const tasks = page.getByRole("list", { name: "Saved tasks" });
  const completed = tasks.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Task #1", exact: true }) });
  await expect(completed).toContainText("Calls finished");
  await expect(completed).toContainText("Awaiting operator merge");
  await expect(completed).toContainText("Review the proposed change before merging.");
  await expect(completed.getByRole("region", { name: "Source message" })).toContainText("Keep this original instruction visible with the task.");
  await completed.getByRole("button", { name: "Review PR #1", exact: true }).click();
  await expect(page).toHaveURL(/view=changes&pull=task-navigation-approved$/);
  await expect(page.getByRole("heading", { name: /Recorded proposal awaiting operator review/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Merge pull request", exact: true })).toBeEnabled();
  await page.goBack();
  const failed = tasks.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Task #2", exact: true }) });
  await expect(failed).toContainText("No pull request");
  await expect(failed.getByRole("button", { name: /PR #/ })).toHaveCount(0);
  await failed.getByRole("button", { name: "Task #2 timeline", exact: true }).click();
  await expect(page.getByRole("list", { name: "Collaboration timeline" })).toContainText("Fixture provider stopped before producing a proposal.");
  await page.goto("/#/commons/safe-timer?view=tasks&task=missing-task-fixture");
  await expect(page.getByRole("status").filter({ hasText: "Task not found in this project." })).toBeVisible();
  await expect(page.getByText(/No tasks yet/)).toHaveCount(0);
});

test("structured reviews retain source evidence, limitations and legacy summaries", async ({ page }) => {
  let snapshot;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/commons?**", async (route) => {
    if (!snapshot) {
      snapshot = await (await route.fetch()).json();
      const project = snapshot.projects.find((item) => item.id === "safe-timer");
      const proposal = {
        path: "src/retry-delay.js", baseRevision: project.revision,
        before: "export const DEFAULT_DELAY = 1000;\rexport function retryDelay(value) {\r  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DELAY;\r}",
        after: "export function retryDelay(value) {\n  if (!Number.isFinite(value)) return 1000;\n  return value;\n}",
        check: { passed: true }, hash: "browser-fixture-only", status: "changes-requested",
      };
      project.prs = [
        {
          ...proposal, id: "structured-review-fixture", title: "Recorded review with source evidence",
          review: {
            approve: false, message: "The proposal removes a public export and accepts negative delays.",
            generalMessage: "Changes requested for the retained delay proposal.",
            findings: [
              {
                bug: "The proposal removes the public DEFAULT_DELAY export.",
                path: proposal.path, line: 1, side: "before",
                evidence: "The original file exports DEFAULT_DELAY on line 1; the proposed file has no matching export.",
                consequence: "Existing named imports of DEFAULT_DELAY fail when loading the module.",
                fix: "Preserve the DEFAULT_DELAY export while changing delay validation.",
              },
              {
                bug: "Negative finite values remain accepted by the proposal.",
                path: proposal.path, line: 3, side: "after",
                evidence: "With value = -1, Number.isFinite(value) is true and the function returns -1.",
                consequence: "The returned delay violates the non-negative delay contract.",
                fix: "Reject values below zero before returning the delay.",
              },
            ],
            limitations: ["The proposed JavaScript was not executed.", "Only the retained file and task context were reviewed."],
          },
        },
        {
          ...proposal, id: "empty-review-fixture", title: "Recorded review without findings", status: "approved",
          review: {
            approve: true, message: "No source-level defect was identified in this bounded review.",
            generalMessage: "Operator review remains required.", findings: [],
            limitations: ["Runtime behavior has not been verified."],
          },
        },
        {
          ...proposal, id: "legacy-review-fixture", title: "Retained legacy review", status: "approved",
          review: { approve: true, message: "Historical summary remains available without structured findings." },
        },
      ];
      snapshot.version += 100;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/commons/safe-timer?view=changes&pull=structured-review-fixture");
  const review = page.getByRole("region", { name: "Reviewer findings", exact: true });
  const original = review.getByRole("article", { name: "Finding 1", exact: true });
  const proposed = review.getByRole("article", { name: "Finding 2", exact: true });
  await expect(original).toContainText("src/retry-delay.js:1 · Before change");
  await expect(proposed).toContainText("src/retry-delay.js:3 · After change");
  await expect(original.getByRole("region", { name: "Finding 1 source: Before src/retry-delay.js:1" }))
    .toHaveText("export const DEFAULT_DELAY = 1000;");
  expect(await page.getByRole("region", { name: "Source before change", exact: true }).textContent())
    .toBe("export const DEFAULT_DELAY = 1000;\nexport function retryDelay(value) {\n  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DELAY;\n}");
  await expect(original).toContainText("Existing named imports of DEFAULT_DELAY fail when loading the module.");
  await expect(proposed.getByRole("region", { name: "Finding 2 source: After src/retry-delay.js:3" }))
    .toHaveText("  return value;");
  for (const label of ["Bug:", "Evidence:", "Consequence:", "Minimal fix:"])
    await expect(proposed.getByText(label, { exact: true })).toBeVisible();
  await expect(proposed).toContainText("With value = -1, Number.isFinite(value) is true and the function returns -1.");
  await expect(proposed).toContainText("The returned delay violates the non-negative delay contract.");
  await expect(proposed).toContainText("Reject values below zero before returning the delay.");
  await expect(review.getByRole("region", { name: "Review limitations" }))
    .toContainText("The proposed JavaScript was not executed.");
  await expect(page.getByRole("button", { name: "Merge pull request", exact: true })).toBeDisabled();
  for (const [size, width, height] of [["desktop", 1440, 1000], ["narrow", 390, 844]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    if (process.env.CZ_CAPTURE_BROWSER === "1") {
      const directory = "runtime/verification/strict-reviewer-2026-10-23";
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: `${directory}/structured-review-${size}.png`, fullPage: true });
    }
  }
  await page.goto("/#/commons/safe-timer?view=changes&pull=empty-review-fixture");
  await expect(review.getByText("No concrete defects identified.", { exact: true })).toBeVisible();
  await expect(review.getByRole("region", { name: "Review limitations" }))
    .toContainText("Runtime behavior has not been verified.");
  await page.goto("/#/commons/safe-timer?view=changes&pull=legacy-review-fixture");
  await expect(page.getByText("Reviewer: Historical summary remains available without structured findings.", { exact: true })).toBeVisible();
  await expect(review).toHaveCount(0);
  await expect(page.getByText("No concrete defects identified.", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
