import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("observer flow, persistence, keyboard, contrast and narrow layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Обзор среды", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Следующий шаг", exact: true })
    .click();
  await expect(page.locator("#playback-status")).toHaveText("Шаг 1 / 10");
  await page.reload();
  await expect(page.locator("#playback-status")).toHaveText("Шаг 1 / 10");
  for (let i = 2; i <= 10; i++) {
    await page
      .getByRole("button", { name: "Следующий шаг", exact: true })
      .click();
    await expect(page.locator("#playback-status")).toHaveText(
      i === 10 ? "Цикл завершён" : `Шаг ${i} / 10`,
    );
  }
  await page
    .getByRole("link", { name: "Посмотреть новый проект", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /gemini \/ orbital-garden/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть превью", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .frameLocator("#preview-frame")
    .getByRole("button", { name: "Добавить спутник" })
    .click();
  await expect(
    page.frameLocator("#preview-frame").getByRole("status"),
  ).toContainText("4");
  await page
    .frameLocator("#preview-frame")
    .getByRole("button", { name: "Добавить спутник" })
    .press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Открыть превью", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  expect(errors).toEqual([]);
});
