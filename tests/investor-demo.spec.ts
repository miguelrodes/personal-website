import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const portfolioAppearance = (page: Page) => page.locator('.site-header, .site-header .wordmark, .project-row, .profile-heading h1')
  .evaluateAll(elements => elements.map(el => {
    const s = getComputedStyle(el);
    return [s.fontFamily, s.fontSize, s.color, s.backgroundColor, s.display, s.padding, s.borderRadius];
  }));

async function launch(page: Page, home = false) {
  await page.goto(home ? '/' : '/work/aldea-investor-portal');
  if (home) await page.getByRole('button', { name: 'View project : Aldea Investor Portal', exact: true }).click();
  const launchButton = page.locator('.portal-demo-trigger');
  await launchButton.scrollIntoViewIfNeeded();
  await launchButton.focus();
  const position = await page.evaluate(() => ({ x: scrollX, y: scrollY, url: location.href }));
  const before = await portfolioAppearance(page);
  await launchButton.click();
  const dialog = page.getByRole('dialog', { name: 'Aldea Investor Portal', exact: true });
  await expect(dialog.getByText('Key Performance Indicators', { exact: true })).toBeVisible();
  return { dialog, launchButton, position, before };
}

test('opens lazily in place, restores scroll and focus, and resets on reopening', async ({page, isMobile}, info) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  expect(requests.some(u => /src\/demo\/|InvestorPortalDemo|plotly/.test(u))).toBe(false);
  const { dialog, launchButton, position, before } = await launch(page, true);
  expect(await page.url()).toBe(position.url);
  expect(page.context().pages()).toHaveLength(1);
  await expect(dialog.getByRole('img', { name: 'Aldea', exact: true })).toBeVisible();
  await expect(dialog.getByText('MOCK DATA', { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('navigation', { name: 'Reporting sections' })).toHaveCount(0);
  await expect(dialog.getByRole('combobox', { name: /^(Fund|Quarter)$/ })).toHaveCount(0);
  const surfaces = await dialog.locator('.portal-demo-header, .portal-demo-scroll, .aldea-demo, #report-section-overview')
    .evaluateAll(elements => elements.map(el => getComputedStyle(el).backgroundColor));
  expect(surfaces).toEqual(Array(4).fill('rgb(244, 241, 235)'));
  await expect(dialog.getByRole('button', { name: 'Close interactive demo' })).toHaveCSS('border-top-width', '0px');
  await page.screenshot({path:info.outputPath('portal-overview.png')});
  await expect(dialog.getByRole('button', {name:'Close interactive demo'})).toBeFocused();
  const size = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(size.width / viewport.width).toBeGreaterThan(isMobile ? .98 : .94);
  expect(size.height / viewport.height).toBeGreaterThan(.93);
  expect(await dialog.locator('section[id^="report-section-"]').evaluateAll(es => es.map(e=>e.id)))
    .toEqual(['report-section-overview','report-section-portfolio','report-section-exposure']);
  await expect(dialog.getByText(/Portfolio highlights|Admin Settings|Simulation mode|Save report|Print\/PDF/)).toHaveCount(0);
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.locator('.site-header .wordmark').evaluate(e => (e as HTMLElement).focus());
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await dialog.getByRole('button', {name:'View full KPI list', exact:true}).click();
  await expect(dialog.getByText('Total commitments', {exact:true})).toBeVisible();
  await dialog.getByRole('button', {name:'Close interactive demo'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(launchButton).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(position.y, 0);
  await launchButton.click();
  await expect(dialog.getByRole('button', {name:'View full KPI list', exact:true})).toBeVisible();
  await expect(dialog.getByText('Total commitments', {exact:true})).toHaveCount(0);
  await expect(dialog.locator('.js-plotly-plot').first().locator('.scatterlayer')).toBeVisible();
  await expect(dialog.locator('.rsm-geography').first()).toBeVisible();
  await dialog.getByRole('button', {name:'Close interactive demo'}).focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(launchButton).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(position.y, 0);
  expect(requests.filter(u => /^https?:/.test(u) && new URL(u).hostname !== '127.0.0.1')).toEqual([]);
  expect(errors).toEqual([]);
  expect(await portfolioAppearance(page)).toEqual(before);
  await page.screenshot({path:info.outputPath('portfolio-after-close.png')});
});

test('complete quarter movement, byFounders and Lovable drill-downs, filters and charts', async ({page, isMobile}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url()); });
  const {dialog} = await launch(page);
  for (const label of ['Residual Value - start of quarter','Paid in Capital (+)','Unrealized gains / (losses) (+/-)',
    'Investment income (+)','Management Fees (-)','Other Income / (Expense) (+/-)','Distributions (-)','Carry Allocation (-)',
    'Residual Value - end of quarter']) await expect(dialog.getByText(label,{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'View full KPI list',exact:true}).click();
  await expect(dialog.getByText('Total commitments',{exact:true})).toBeVisible();
  await expect(dialog.locator('.js-plotly-plot').first().locator('.scatterlayer')).toBeVisible();
  const search=dialog.getByPlaceholder('Search fund, company, sector, or note');
  await search.fill('Lovable');
  const fund=dialog.getByRole('button',{name:/^byFounders VC Fund II/});
  await expect(fund).toBeVisible();
  // Click the visible fund label when the table is wider than a phone viewport.
  await fund.getByText('byFounders VC Fund II',{exact:true}).click();
  await expect(dialog.getByText('Fund Identity',{exact:true})).toBeVisible();
  await expect(dialog.getByText('Underlying Company MOIC Scatter',{exact:true})).toBeVisible();
  const lovable=dialog.getByRole('button',{name:/^Lovable Industrial/}).first();
  await lovable.getByText('Lovable',{exact:true}).click();
  await expect(dialog.getByText('GPT-powered interface streamlines coding, previews, and publishing instantly.',{exact:true}).first()).toBeVisible();
  await expect(dialog.getByText('Current Fund Snapshot',{exact:true}).first()).toBeVisible();
  await page.screenshot({path:info.outputPath('lovable-profile.png')});
  const trajectories=dialog.getByRole('button',{name:'View Trajectory',exact:true});
  for (let i=0; i<3; i++) await trajectories.first().click();
  await expect(dialog.getByRole('button',{name:'Hide Trajectory',exact:true})).toHaveCount(2);
  const companyChart = dialog.getByTestId('holding-company-moic-scatter-viewport');
  const domain = async () => (await companyChart.getAttribute('data-y-domain'))!.split(',').map(Number);
  const originalRange = await domain();
  await companyChart.dispatchEvent('wheel', {deltaY: 45, deltaX: 20, bubbles: true, cancelable: true});
  await expect.poll(domain).not.toEqual(originalRange);
  const panned = await domain();
  expect(panned[1]! - panned[0]!).toBeCloseTo(originalRange[1]! - originalRange[0]!, 8);
  await companyChart.dispatchEvent('wheel', {deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true});
  await expect.poll(async () => { const d = await domain(); return d[1]! - d[0]!; })
    .toBeLessThan(originalRange[1]! - originalRange[0]!);
  await dialog.getByRole('button', {name:'Reset view', exact:true}).click();
  await expect.poll(domain).toEqual(originalRange);
  // Exercise the original two-touch path as well as desktop trackpad pinch.
  await companyChart.evaluate(el => {
    const bounds = el.getBoundingClientRect();
    const touch = (id: number, y: number) => new Touch({identifier:id, target:el,
      clientX:bounds.left + 80, clientY:bounds.top + y});
    el.dispatchEvent(new TouchEvent('touchstart', {touches:[touch(1,80), touch(2,140)], bubbles:true}));
    el.dispatchEvent(new TouchEvent('touchmove', {touches:[touch(1,50), touch(2,180)], bubbles:true, cancelable:true}));
    el.dispatchEvent(new TouchEvent('touchend', {touches:[], bubbles:true}));
  });
  await expect.poll(async () => { const d = await domain(); return d[1]! - d[0]!; })
    .toBeLessThan(originalRange[1]! - originalRange[0]!);
  await dialog.getByRole('button', {name:'Reset view', exact:true}).click();
  if (!isMobile) {
    await page.setViewportSize({width:1100,height:800});
    await expect(dialog.locator('.js-plotly-plot').first()).toBeVisible();
  }
  // A nested menu must consume Escape before the main dialog.
  await search.fill('');
  const sort=dialog.getByRole('combobox').filter({hasText:'Ranked by'});
  await sort.click();
  await expect(dialog.getByRole('option',{name:'Name',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('option',{name:'Name',exact:true})).toHaveCount(0);
  await sort.click();
  await dialog.getByRole('option',{name:'Name',exact:true}).click();
  await expect(sort).toHaveText('Ranked by Name');
  await dialog.getByRole('button',{name:'All sectors',exact:true}).click();
  await expect(dialog.getByRole('dialog').first()).toBeVisible();
  const sector = dialog.getByRole('checkbox').first();
  await sector.check();
  await expect(sector).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('exposure map, categories and responsive containment', async ({page}, info) => {
  const external: string[]=[];
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url()); });
  const {dialog} = await launch(page);
  await dialog.getByText('Geographic Exposure',{exact:true}).scrollIntoViewIfNeeded();
  await expect(dialog.getByText('Geographic Exposure',{exact:true})).toBeInViewport();
  await expect(dialog.locator('.rsm-geography').first()).toBeVisible();
  await dialog.getByRole('button',{name:'Europe',exact:true}).click();
  await dialog.getByRole('button',{name:'Denmark',exact:true}).first().click();
  await expect(dialog.getByText('Denmark companies',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:/^Finance €/}).click();
  await expect(dialog.getByText('Selected industry',{exact:true})).toBeVisible();
  expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  expect(external).toEqual([]);
  await page.screenshot({path:info.outputPath('exposure.png')});
  const results=await new AxeBuilder({page}).include('.portal-demo-dialog')
    .withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
});

for (const invalid of [false,true]) test(`fails closed when mock input is ${invalid?'invalid':'missing'}`, async ({page})=>{
  await page.route('**/src/demo/mock-data/qualitativePortfolioSnapshot.json*', route => invalid
    ? route.fulfill({contentType:'text/javascript',body:'export default {schema_version:"invalid",funds:[]};'})
    : route.abort());
  await page.goto('/work/aldea-investor-portal');
  await page.locator('.portal-demo-trigger').click();
  const dialog=page.getByRole('dialog',{name:'Aldea Investor Portal',exact:true});
  await expect(dialog.getByText('Demo temporarily unavailable.',{exact:true})).toBeVisible();
  await expect(dialog.locator('[id^="report-section-"]')).toHaveCount(0);
  await dialog.getByRole('button',{name:'Close interactive demo'}).click();
  await expect(dialog).toHaveCount(0);
});
