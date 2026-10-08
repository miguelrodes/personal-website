import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { profile, projects } from "../src/content";

for (const route of [
  "/",
  "/contact",
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
        if (project.media.loomUrl) {
          await expect(
            page.getByRole("link", { name: "Watch walkthrough" }),
          ).toHaveAttribute("href", project.media.loomUrl);
          await expect(page.locator(".media-actions a")).toHaveCount(1);
        } else {
          await expect(
            page.getByText("Walkthrough coming soon", { exact: true }),
          ).toBeVisible();
          await expect(page.locator(".media-actions a")).toHaveCount(0);
        }
      } else await expect(page.locator(".media-actions")).toHaveCount(0);
    } else if (route === "/contact") {
      await expect(page).toHaveTitle(`Contact — ${profile.name}`);
      await expect(page.getByRole("heading", { name: "Let’s connect", level: 1 })).toBeVisible();
      await expect(page.locator(".connect-email")).toHaveAttribute("href", `mailto:${profile.email}`);
      await expect(page.locator(".connect-availability")).toHaveText(profile.availability);
      await expect(page.getByRole("navigation", { name: "On this page" })).toHaveCount(0);
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

test("work drilldown, keyboard focus, and real résumé asset", async ({
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
  await page.getByRole("link", { name: "Portfolio", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await page
    .getByRole("button", {
      name: "View project : Aldea Investor Portal",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#aldea-investor-portal-details")).toBeVisible();
  await expect(page).toHaveURL(/\/#work$/);
  await page.locator("#aldea-investor-portal .project-toggle").click();
  await expect(page.locator("#aldea-investor-portal-details")).toBeHidden();
  await expect(page.locator("#aldea-investor-portal .project-toggle")).toBeFocused();
  const pdf = await request.get(profile.resumeUrl);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect(
    createHash("sha256")
      .update(await pdf.body())
      .digest("hex"),
  ).toBe("59f366e059f1691882da5ccade9bc4df0813e10d290f6c8c50a2933065785250");
  await expect(page.locator(".portrait-links")).toHaveAttribute("id", "contact");
  await expect(page.locator(".portrait-links a")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "email" })).toBeVisible();
  await expect(page.locator(".contact-strip")).toHaveCount(0);
  for (const link of await page.locator('a[target="_blank"]').all())
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("reduced motion and narrow layout preserve content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/contact", "/work/kuspace"]) {
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
    await expect(page.getByRole("navigation", { name: "On this page" })).toBeHidden();
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/work/aldea-investor-portal");
  const contents = page.getByRole("navigation", { name: "On this page" });
  await expect(contents.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "location");
  await contents.getByRole("link", { name: "Outcome", exact: true }).click();
  await expect(contents.getByRole("link", { name: "Outcome", exact: true })).toHaveAttribute("aria-current", "location");
  await expect(contents.locator(".contents-marker").first()).toHaveCSS("transition-duration", "0s");
});

test("header opens the portfolio and contact page and downloads the actual résumé", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#profile img").evaluateAll((images) =>
    Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
  );
  await expect(page.locator(".wordmark")).toHaveText(profile.name);
  await expect(page.locator(".profile-heading h1")).not.toContainText(".");
  await page.screenshot({ path: testInfo.outputPath("home-header.png") });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await navigation.getByRole("link", { name: "Portfolio", exact: true }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect(page.locator("#work-title")).toBeInViewport();
  await navigation.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(navigation.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".connect-social").first()).toHaveAttribute("href", profile.linkedin);
  await expect(page.locator(".connect-social").last()).toHaveAttribute("href", profile.github);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("contact-page.png"), fullPage: true });
  const downloadEvent = page.waitForEvent("download");
  await navigation.getByRole("link", { name: /^Resume/ }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(profile.resumeFilename);
  expect(await download.failure()).toBeNull();
  const downloadedFile = await download.path();
  expect(downloadedFile).toBeTruthy();
  expect(createHash("sha256").update(await readFile(downloadedFile!)).digest("hex"))
    .toBe("59f366e059f1691882da5ccade9bc4df0813e10d290f6c8c50a2933065785250");
  await expect(page).toHaveURL(/\/contact$/);
  await navigation.getByRole("link", { name: "Portfolio", exact: true }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect(page.locator("#work-title")).toBeInViewport();
});

test("contents reveal on hover and keyboard focus, navigate, and track scrolling", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "The floating contents are a desktop navigation control.");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#profile img").evaluateAll((images) =>
    Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
  );
  const contents = page.getByRole("navigation", { name: "On this page" });
  const profileLink = contents.getByRole("link", { name: "Profile", exact: true });
  const contactLink = contents.getByRole("link", { name: "Contact", exact: true });
  await expect(profileLink).toHaveAttribute("aria-current", "location");
  await expect(profileLink.locator(".contents-title")).toHaveCSS("opacity", "1");
  await expect(contactLink.locator(".contents-title")).toHaveCSS("opacity", "0");
  await expect(profileLink.locator(".contents-marker")).toHaveCSS("width", "32px");
  await expect(contactLink.locator(".contents-marker")).toHaveCSS("width", "24px");
  await expect(page.locator(".profile-role .availability-tag")).toHaveText("Availability: January - June 2027");
  await page.screenshot({ path: testInfo.outputPath("contents-collapsed.png") });
  await contents.hover();
  for (const title of await contents.locator(".contents-title").all()) {
    await expect(title).toHaveCSS("opacity", "1");
  }
  await page.screenshot({ path: testInfo.outputPath("contents-expanded.png") });
  await page.mouse.move(0, 0);
  await expect(contactLink.locator(".contents-title")).toHaveCSS("opacity", "0");
  await contactLink.focus();
  await expect(contents.getByRole("link", { name: "KUSPACE", exact: true }).locator(".contents-title")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contact$/);
  await expect(contactLink).toHaveAttribute("aria-current", "location");
  await contents.getByRole("link", { name: "Investor Simulation", exact: true }).click();
  await expect(page).toHaveURL(/#aldea-investor-simulation$/);
  await expect(contents.getByRole("link", { name: "Investor Simulation", exact: true })).toHaveAttribute("aria-current", "location");
  await page.mouse.move(500, 500);
  await page.mouse.wheel(0, 10000);
  await expect(contents.getByRole("link", { name: "KUSPACE", exact: true })).toHaveAttribute("aria-current", "location");
  await page.goto("/work/aldea-investor-portal#process");
  await expect(contents.getByRole("link", { name: "Process", exact: true })).toHaveAttribute("aria-current", "location");
});
