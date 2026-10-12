import { test, expect, type Locator, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/work/aldea-investor-portal");
  await page.locator(".portal-demo-trigger").click();
  await expect(page.getByText("Key Performance Indicators", { exact: true })).toBeVisible();
  return errors;
}

async function openHolding(page: Page) {
  await page.getByPlaceholder("Search fund, company, sector, or note").fill("Lovable");
  await page.getByRole("button", { name: /^byFounders VC Fund II/ })
    .getByText("byFounders VC Fund II", { exact: true }).click();
  await expect(page.getByText("Fund Identity", { exact: true })).toBeVisible();
}

const range = async (viewport: Locator, axis: "x" | "y") =>
  (await viewport.getAttribute(`data-${axis}-domain`))!.split(",").map(Number);
const span = (domain: number[]) => domain[1] - domain[0];

async function wheel(viewport: Locator, deltaY: number, ctrlKey = false, deltaX = 0) {
  const box = (await viewport.boundingBox())!;
  const clientX = Math.round(box.x + box.width * .55), clientY = Math.round(box.y + box.height * .38);
  await viewport.dispatchEvent("wheel", {
    deltaY, deltaX, ctrlKey, bubbles: true, cancelable: true,
    clientX, clientY,
  });
  return { clientX, clientY, box };
}

async function pinch(viewport: Locator) {
  await viewport.evaluate(element => {
    const box = element.getBoundingClientRect();
    const touch = (identifier: number, offset: number) => new Touch({ identifier, target: element,
      clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 + offset });
    element.dispatchEvent(new TouchEvent("touchstart", { touches: [touch(1, -40), touch(2, 40)], bubbles: true, cancelable: true }));
    element.dispatchEvent(new TouchEvent("touchmove", { touches: [touch(1, -60), touch(2, 60)], bubbles: true, cancelable: true }));
    element.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
  });
}

async function safariPinch(viewport: Locator, scale = 1.25) {
  await viewport.evaluate((element, scale) => {
    const box = element.getBoundingClientRect();
    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { scale: type === "gesturestart" ? 1 : scale,
        clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 });
      element.dispatchEvent(event);
    }
  }, scale);
}

async function checkScatter(page: Page, viewport: Locator) {
  await viewport.scrollIntoViewIfNeeded();
  const card = viewport.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  const originalX = await range(viewport, "x"), originalY = await range(viewport, "y");
  const height = await viewport.evaluate(element => element.clientHeight);
  const reportTop = await page.locator(".portal-demo-scroll").evaluate(element => element.scrollTop);
  const reset = async () => {
    await card.getByRole("button", { name: "Reset view", exact: true }).click();
    await expect.poll(() => range(viewport, "x")).toEqual(originalX);
    await expect.poll(() => range(viewport, "y")).toEqual(originalY);
  };
  await wheel(viewport, 35, false, 15);
  await expect.poll(() => range(viewport, "x")).not.toEqual(originalX);
  await expect.poll(() => range(viewport, "y")).not.toEqual(originalY);
  expect(span(await range(viewport, "x"))).toBeCloseTo(span(originalX), 8);
  expect(span(await range(viewport, "y"))).toBeCloseTo(span(originalY), 8);
  expect(await page.locator(".portal-demo-scroll").evaluate(element => element.scrollTop)).toBeCloseTo(reportTop, 0);
  await reset();

  const pointer = await wheel(viewport, -80, true);
  await expect.poll(async () => span(await range(viewport, "y"))).toBeLessThan(span(originalY));
  const zoomed = await range(viewport, "y");
  expect(span(zoomed) / span(originalY)).toBeCloseTo(Math.exp(-.6), 8);
  expect(await range(viewport, "x")).toEqual(originalX);
  const ratio = ((pointer.clientY - pointer.box.y) / pointer.box.height * height - 18) / (height - 36);
  expect(zoomed[1] - ratio * span(zoomed)).toBeCloseTo(originalY[1] - ratio * span(originalY), 6);
  const canvas = await viewport.evaluate(element => ({ width: element.clientWidth,
    canvasWidth: element.firstElementChild!.getBoundingClientRect().width / (element.getBoundingClientRect().width / element.clientWidth) }));
  expect(canvas.canvasWidth).toBeCloseTo(canvas.width, 0);
  if (await viewport.locator(".js-plotly-plot").count()) {
    await expect.poll(() => viewport.locator(".js-plotly-plot").evaluate(element =>
      (element as unknown as { _fullLayout: { yaxis: { range: number[] } } })._fullLayout.yaxis.range)).toEqual(zoomed);
  }
  await viewport.dispatchEvent("dblclick", { bubbles: true, cancelable: true });
  await expect.poll(() => range(viewport, "y")).toEqual(originalY);

  await pinch(viewport);
  await expect.poll(async () => span(await range(viewport, "y"))).toBeLessThan(span(originalY));
  expect(span(await range(viewport, "y")) / span(originalY)).toBeCloseTo(1 / 1.5 ** 3, 8);
  await reset();
  await safariPinch(viewport);
  await expect.poll(async () => span(await range(viewport, "y"))).toBeLessThan(span(originalY));
  expect(span(await range(viewport, "y")) / span(originalY)).toBeCloseTo(1 / 1.25 ** 3, 8);
  await reset();
  await safariPinch(viewport, 100);
  await expect.poll(async () => span(await range(viewport, "y")) / span(originalY)).toBeCloseTo(1 / 64, 8);
  await reset();
  await safariPinch(viewport, .01);
  await expect.poll(async () => span(await range(viewport, "y")) / span(originalY)).toBeCloseTo(8, 8);
  await reset();
}

test("fund, comparison, and company scatters share pan, anchored zoom, pinch, limits, and reset", async ({ page }) => {
  test.setTimeout(90000);
  const errors = await openDemo(page);
  const main = page.getByTestId("fund-scatter-main-viewport");
  await expect(main.locator(".scatterlayer")).toBeVisible();
  await checkScatter(page, main);
  await openHolding(page);
  const comparison = page.getByTestId("fund-scatter-compare-viewport");
  await expect(comparison.locator(".scatterlayer")).toBeVisible();
  await checkScatter(page, comparison);
  await checkScatter(page, page.getByTestId("holding-company-moic-scatter-viewport"));
  expect(errors).toEqual([]);
});

async function checkMap(viewport: Locator) {
  await viewport.scrollIntoViewIfNeeded();
  const originalCenter = await viewport.getAttribute("data-center");
  const originalZoom = Number(await viewport.getAttribute("data-zoom"));
  const zoom = async () => Number(await viewport.getAttribute("data-zoom"));
  const reset = async () => {
    await viewport.getByRole("button", { name: "Reset view", exact: true }).click();
    await expect(viewport).toHaveAttribute("data-center", originalCenter!);
    await expect.poll(zoom).toBe(originalZoom);
  };
  await wheel(viewport, 30, false, 20);
  await expect(viewport).not.toHaveAttribute("data-center", originalCenter!);
  expect(await zoom()).toBe(originalZoom);
  await reset();
  const anchor = await viewport.evaluate(element => {
    const box = element.getBoundingClientRect();
    const screen = new DOMPoint(Math.round(box.left + box.width * .55), Math.round(box.top + box.height * .38));
    const group = element.querySelector<SVGGElement>(".rsm-zoomable-group")!;
    const point = screen.matrixTransform(group.getScreenCTM()!.inverse());
    return { x: point.x, y: point.y, screenX: screen.x, screenY: screen.y };
  });
  await wheel(viewport, -80, true);
  await expect.poll(zoom).toBeGreaterThan(originalZoom);
  expect(await zoom()).toBeCloseTo(originalZoom * Math.exp(.6), 8);
  await expect.poll(() => viewport.evaluate((element, anchor) => {
    const group = element.querySelector<SVGGElement>(".rsm-zoomable-group")!;
    const point = new DOMPoint(anchor.x, anchor.y).matrixTransform(group.getScreenCTM()!);
    return Math.hypot(point.x - anchor.screenX, point.y - anchor.screenY);
  }, anchor)).toBeLessThan(.6);
  await viewport.dispatchEvent("dblclick", { bubbles: true, cancelable: true });
  await expect.poll(zoom).toBe(originalZoom);
  await expect(viewport).toHaveAttribute("data-center", originalCenter!);
  await pinch(viewport);
  await expect.poll(zoom).toBe(6);
  await reset();
  await safariPinch(viewport);
  await expect.poll(zoom).toBeCloseTo(originalZoom * 1.25 ** 3, 8);
  await reset();
  await safariPinch(viewport, .01);
  await expect.poll(zoom).toBe(1.8);
}

test("both geographic maps pan on scroll and share anchored pinch, bounds, and reset", async ({ page }) => {
  test.setTimeout(90000);
  const errors = await openDemo(page);
  const exposure = page.getByTestId("geographic-map-viewport");
  await expect(exposure.locator(".rsm-geography").first()).toBeVisible();
  await checkMap(exposure);
  await openHolding(page);
  await expect(page.getByTestId("geographic-map-viewport")).toHaveCount(2);
  await checkMap(page.getByTestId("geographic-map-viewport").first());
  expect(errors).toEqual([]);
});

test("map country selection, presets, and mouse dragging survive zoom navigation", async ({ page, isMobile }) => {
  const errors = await openDemo(page);
  const viewport = page.getByTestId("geographic-map-viewport");
  const map = viewport.locator("..");
  await map.getByRole("button", { name: "Europe", exact: true }).click();
  await expect(viewport).toHaveAttribute("data-zoom", "3.5");
  await map.getByRole("button", { name: "Denmark", exact: true }).first().click();
  await expect(viewport.getByText("Denmark", { exact: true })).toBeVisible();
  await wheel(viewport, 20, false, 20);
  await expect(viewport).toHaveAttribute("data-zoom", "3.5");
  await expect(viewport.getByText("Denmark", { exact: true })).toBeVisible();
  await viewport.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(viewport.getByText("Denmark", { exact: true })).toBeVisible();
  if (!isMobile) {
    const before = await viewport.getAttribute("data-center");
    const box = (await viewport.boundingBox())!;
    await page.mouse.move(box.x + box.width * .6, box.y + box.height * .6);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .6 + 35, box.y + box.height * .6 + 20, { steps: 5 });
    await page.mouse.up();
    await expect(viewport).not.toHaveAttribute("data-center", before!);
    await expect(viewport).toHaveAttribute("data-zoom", "1.8");
  }
  expect(errors).toEqual([]);
});
