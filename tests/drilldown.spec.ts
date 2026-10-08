import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { projects } from "../src/content";

for (const [index, project] of projects.entries()) {
  test(`${project.slug} expands in place and closes back to its preview`, async ({ page, isMobile }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#main").evaluate(element => { element.dataset.navigationCheck = "original"; });
    const row = page.locator(`#${project.slug}`);
    const details = page.locator(`#${project.slug}-details`);
    const toggle = row.locator(".project-toggle");
    const following = index < projects.length - 1
      ? page.locator(`#${projects[index + 1].slug}`) : page.locator(".site-footer");
    const followingTop = await following.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
    await expect(details).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(details).toBeVisible();
    await details.evaluate(async element => {
      await Promise.allSettled(element.getAnimations({ subtree: true }).map(animation => animation.finished));
    });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#main")).toHaveAttribute("data-navigation-check", "original");
    await expect(details.locator("h5")).toHaveText(project.sections.map(section => section.title));
    await expect(details.locator(".case-section-copy > p")).toHaveText(project.sections.map(section => section.text));
    await expect(details.locator(".drilldown-body")).toHaveCSS("opacity", "1");
    await expect.poll(async () => Math.abs((await details.boundingBox())!.y)).toBeLessThan(3);
    await expect(details.locator(".drilldown-heading .drilldown-close")).toBeFocused();
    const height = (await details.boundingBox())!.height;
    expect(height).toBeGreaterThan(1000);
    const nextTop = await following.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
    expect(nextTop - followingTop).toBeGreaterThan(height - 50);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (!isMobile) {
      const images = await details.locator(".case-image-pair .media-frame").all();
      const first = (await images[0].boundingBox())!;
      const second = (await images[1].boundingBox())!;
      expect(Math.abs(first.y - second.y)).toBeLessThan(2);
      expect(second.x).toBeGreaterThan(first.x + first.width);
    }
    const accessibility = await new AxeBuilder({ page }).include(`#${project.slug}-details`)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    if (index === 0 || index === 3) {
      await page.screenshot({ path: testInfo.outputPath("expanded-preview.png") });
      await details.locator(".case-image-pair").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("paired-visuals.png") });
    }
    await details.locator(".drilldown-close-bottom").click();
    await expect(details).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(toggle).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test("reduced motion, title controls, and independent open projects", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  for (const project of projects) {
    const title = page.locator(`#${project.slug} .project-title-toggle`);
    await title.focus();
    await page.keyboard.press("Enter");
    await expect(title).toHaveAttribute("aria-expanded", "true");
    const details = page.locator(`#${project.slug}-details`);
    await expect(details).toBeVisible();
    await expect(details).toHaveCSS("transition-duration", "0s");
  }
  await expect(page.locator('.project-row[data-expanded="true"]')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const duplicateIds = await page.locator("[id]").evaluateAll(elements => {
    const ids = elements.map(element => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicateIds).toEqual([]);
  const toggle = page.locator("#kuspace .project-toggle");
  await toggle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#kuspace-details")).toBeHidden();
  await expect(page.locator('.project-row[data-expanded="true"]')).toHaveCount(3);
});
