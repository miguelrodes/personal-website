import { test, expect, type Page } from '@playwright/test';

async function openDemo(page: Page) {
  await page.goto('/tests/fixtures/investor-demo.html');
  await page.getByRole('button', { name: 'Preview synthetic demo' }).click();
  await expect(page.getByText('Key Performance Indicators', { exact: true })).toBeVisible();
}

test('section rail stays visible, navigates the report, and tracks the current section', async ({ page }, info) => {
  await openDemo(page);
  const nav = page.getByRole('navigation', { name: 'Reporting sections' });
  await expect(nav.getByRole('button')).toHaveCount(3);
  for (const [label, id] of [['Exposure', 'exposure'], ['Portfolio Explorer', 'portfolio'], ['Overview', 'overview']]) {
    const button = nav.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'true');
    await expect.poll(async () => {
      const section = await page.locator(`#report-section-${id}`).boundingBox();
      const report = await page.locator('.portal-demo-scroll').boundingBox();
      const atEnd = await page.locator(".portal-demo-scroll").evaluate(el => el.scrollTop >= el.scrollHeight - el.clientHeight - 1);
      return atEnd && section!.y > report!.y && section!.y < report!.y + report!.height / 2 ? 0 : Math.abs(section!.y - report!.y);
    }).toBeLessThan(25);
    const box = (await nav.boundingBox())!, report = (await page.locator('.portal-demo-scroll').boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(report.x + report.width);
    expect(box.y).toBeGreaterThanOrEqual(report.y);
    expect(box.y + box.height).toBeLessThanOrEqual(report.y + report.height);
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await nav.getByRole('button', {name:'Exposure',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(nav.getByRole('button', {name:'Exposure',exact:true})).toHaveAttribute('aria-current','true');
  await page.screenshot({path: info.outputPath('section-navigation.png')});
});

test('comparison tooltips hit the visible bubble and contain all text at demo zoom', async ({ page }, info) => {
  await openDemo(page);
  await page.getByPlaceholder('Search fund, company, sector, or note').fill('Fund B 1');
  await page.getByRole('button', {name:/^Fund B /}).getByText('Fund B',{exact:true}).click();
  const viewport = page.getByTestId('fund-scatter-compare-viewport');
  await viewport.scrollIntoViewIfNeeded();
  const traces = viewport.locator('.scatterlayer .trace');
  await expect(traces.first().locator('.point')).toBeVisible();
  const trace = traces.filter({has: page.locator('.textpoint', {hasText:/Aldea Synthetic Fund Vintage \d+ Avg$/})}).first();
  const title = await trace.locator('.textpoint').textContent();
  const marker = trace.locator('.point');
  const hoverMarker = async () => {
    await marker.hover({force:true});
    const tooltip = page.locator('.scatter-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('strong')).toHaveText(title!);
    await expect(tooltip.locator('dd')).toHaveCount(4);
    const fits = await tooltip.evaluate(el => {
      const box = el.getBoundingClientRect();
      return Array.from(el.querySelectorAll('strong, dt, dd')).every(child => {
        const b = child.getBoundingClientRect();
        return b.left >= box.left && b.right <= box.right && b.top >= box.top && b.bottom <= box.bottom && child.scrollWidth <= child.clientWidth + 1;
      });
    });
    expect(fits).toBe(true);
  };
  await hoverMarker();
  await page.screenshot({path:info.outputPath('comparison-tooltip.png')});
  const bounds = (await viewport.boundingBox())!;
  await page.mouse.move(bounds.x + 5, bounds.y + 5);
  await expect(page.locator('.scatter-tooltip')).toHaveCount(0);
  // Hover remains aligned after a chart zoom and after trajectory traces are added.
  await viewport.dispatchEvent('wheel', {deltaY:-30,ctrlKey:true,bubbles:true,cancelable:true,clientX:bounds.x + bounds.width/2,clientY:bounds.y + bounds.height/2});
  await hoverMarker();
  await viewport.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]').getByRole('button', {name:'View Trajectory',exact:true}).click();
  await hoverMarker();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test('active stage categories have stable distinct colors', async ({page}) => {
  await openDemo(page);
  await page.getByPlaceholder('Search fund, company, sector, or note').fill('Fund B 1');
  await page.getByRole('button', {name:/^Fund B /}).getByText('Fund B',{exact:true}).click();
  const chart = page.locator('.stage-mix').filter({hasText:'Active Stage Mix'});
  const colors = await chart.locator('.stage-mix-legend button > span:first-child').evaluateAll(els => els.map(el => (el as HTMLElement).style.backgroundColor));
  expect(colors).toHaveLength(4);
  expect(new Set(colors).size).toBe(4);
});


test('main scatter bubble clicks still select and clear a fund', async ({page}) => {
  await openDemo(page);
  const viewport = page.getByTestId('fund-scatter-main-viewport');
  await viewport.scrollIntoViewIfNeeded();
  const marker = viewport.locator('.scatterlayer .trace .point').last();
  await expect(marker).toBeVisible();
  await marker.click({force:true});
  await expect(marker).toHaveCSS('stroke-width','2.2px');
  await marker.click({force:true});
  await expect(marker).toHaveCSS('stroke-width','1.8px');
});
