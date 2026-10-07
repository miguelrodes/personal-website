import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { profile, projects } from "../src/content";

for (const route of [
  "/",
  ...projects.map((project) => `/work/${project.slug}`),
]) {
  test(`${route} loads directly, refreshes, and remains accessible`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.reload();
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const project = projects.find((item) => route.endsWith(item.slug));
    if (project) {
      await expect(page).toHaveTitle(`${project.title} — ${profile.name}`);
      await expect(page.locator("main h2")).toHaveText([
        "Intro",
        "The problem",
        "Context & constraints",
        "Process",
        "Outcome",
      ]);
      await expect(page.locator(".case-section-copy > p")).toHaveText(
        project.sections.map((section) => section.text),
      );
      for (const section of project.sections) {
        expect(section.text.split(/\s+/).length).toBeLessThanOrEqual(65);
        expect(
          section.text.split(/[.!?](?:\s|$)/).filter(Boolean).length,
        ).toBeLessThanOrEqual(3);
      }
      await expect(page.locator(".technology-meta")).toHaveCount(
        project.technologies ? 1 : 0,
      );
      if (
        project.slug === "aldea-investor-portal" ||
        project.slug === "kuspace"
      ) {
        await expect(
          page.getByText("Interactive demo coming soon", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText("Walkthrough coming soon", { exact: true }),
        ).toBeVisible();
        await expect(page.locator(".media-actions a")).toHaveCount(0);
      } else await expect(page.locator(".media-actions")).toHaveCount(0);
    } else {
      await expect(page.locator(".academic-statement")).toHaveText(
        profile.academicStatement,
      );
      await expect(page.locator(".bio")).toHaveText(profile.bio);
      await expect(page.locator(".project-row")).toHaveCount(4);
      await expect(page.locator(".group-heading h3")).toHaveText([
        "Aldea Ventures",
        "Independent work",
      ]);
      const order = await page
        .locator("#profile, #contact, #work")
        .evaluateAll((elements) => elements.map((element) => element.id));
      expect(order).toEqual(["profile", "contact", "work"]);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator('a[href="#"], a[href=""], a[href^="javascript:"]'),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

test("work navigation, return link, keyboard focus, and real résumé asset", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeInViewport();
  await page.keyboard.press("Tab");
  const focusStyle = await page
    .locator(":focus")
    .evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(focusStyle).not.toBe("none");
  await page.getByRole("link", { name: "Review work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await page
    .getByRole("link", {
      name: "View project : Aldea Investor Portal",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/work\/aldea-investor-portal$/);
  await page.getByRole("link", { name: "Selected work", exact: true }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect(page.locator("#work-title")).toBeInViewport();
  const pdf = await request.get(profile.resumeUrl);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect(
    createHash("sha256")
      .update(await pdf.body())
      .digest("hex"),
  ).toBe("c340664a3cac0baa55db605e3724700cb664bc68b2d236145ea67b6ba8027332");
  await expect(page.locator(".primary-actions a").nth(2)).toHaveAttribute(
    "href",
    `mailto:${profile.email}`,
  );
  for (const link of await page.locator('a[target="_blank"]').all())
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("reduced motion and narrow layout preserve content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/work/kuspace"]) {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".scroll-guide")).toBeHidden();
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/work/aldea-investor-portal");
  const start = await page
    .locator(".guide-segment")
    .evaluate((element) => getComputedStyle(element).transform);
  await page.locator("#outcome").scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      page
        .locator(".guide-segment")
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(start);
  expect(
    await page
      .locator(".guide-segment")
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
});
