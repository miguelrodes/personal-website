import { test, expect, type Page } from '@playwright/test';

const previewPath = '/tests/fixtures/investor-demo.html';
async function launch(page: Page) {
  await page.goto(previewPath);
  const launchButton = page.getByRole('button', {name: 'Preview synthetic demo', exact: true});
  await launchButton.click();
  const dialog = page.getByRole('dialog', {name: 'Aldea Investor Portal', exact: true});
  await expect(dialog.getByText('Key Performance Indicators', {exact: true})).toBeVisible();
  return { dialog, launchButton };
}

test('synthetic demo opens from both public entry pages', async ({page}) => {
  const requests: string[] = [];
  page.on('request', r => requests.push(r.url()));
  await page.goto('/');
  await page.locator('#aldea-investor-portal .project-copy').getByRole('button', {name:'Explore Demo',exact:true}).click();
  let dialog = page.getByRole('dialog', {name:'Aldea Investor Portal',exact:true});
  await expect(dialog.getByText('Aldea Synthetic Fund',{exact:true})).toBeVisible();
  await expect(dialog.getByText('Fund A',{exact:true}).first()).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await page.goto('/work/aldea-investor-portal');
  await page.locator('.portal-outcome-media-item').first().getByRole('button',{name:'Explore Demo',exact:true}).click();
  dialog = page.getByRole('dialog', {name:'Aldea Investor Portal',exact:true});
  await expect(dialog.getByText('Aldea Synthetic Fund',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(requests.some(url => /InvestorPortalDemo|src\/demo\/|plotly/.test(url))).toBe(true);
});

test('local review shows synthetic title, loads lazily, and supports dismissal and reopen', async ({page, isMobile}, info) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(previewPath);
  expect(requests.some(url => /InvestorPortalDemo|plotly/.test(url))).toBe(false);
  const {dialog, launchButton} = await launch(page);
  await expect(dialog.getByText('Aldea Synthetic Fund', {exact:true})).toBeVisible();
  await expect(dialog.getByRole('img', {name:'Aldea', exact:true})).toBeVisible();
  expect(await page.url()).toContain(previewPath);
  expect(await dialog.locator('section[id^="report-section-"]').evaluateAll(elements => elements.map(el => el.id)))
    .toEqual(['report-section-overview', 'report-section-portfolio', 'report-section-exposure']);
  await expect(dialog.getByRole('navigation', {name:'Reporting sections'})).toBeVisible();
  await expect(dialog.locator('.js-plotly-plot').first().locator('.scatterlayer')).toBeVisible();
  await expect(dialog.locator('.rsm-geography').first()).toBeVisible();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({path:info.outputPath('synthetic-overview.png')});
  if (isMobile) await page.keyboard.press('Escape');
  else await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(launchButton).toBeFocused();
  await launchButton.click();
  await expect(dialog.getByText('Key Performance Indicators', {exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(requests.filter(url => /^https?:/.test(url) && new URL(url).hostname !== '127.0.0.1')).toEqual([]);
});

test('fictional funds and company profiles feed the tables, histories, and charts', async ({page}, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const {dialog} = await launch(page);
  for (const name of ['Fund A','Fund B','Fund C','Fund D','Fund E']) {
    await expect(dialog.getByRole('button', {name: new RegExp(`^${name} `)}).getByText(name,{exact:true})).toBeVisible();
  }
  await dialog.getByPlaceholder('Search fund, company, sector, or note').fill('Fund A 1');
  await dialog.getByRole('button', {name: /^Fund A /}).getByText('Fund A', {exact:true}).click();
  await expect(dialog.getByText('Fund Identity', {exact:true})).toBeVisible();
  await expect(dialog.getByText('Manager A (fictional)', {exact:true}).last()).toBeVisible();
  await expect(dialog.getByTestId('holding-company-moic-scatter-viewport')).toBeVisible();
  await expect(dialog.getByTestId('fund-scatter-compare-viewport')).toBeVisible();
  await dialog.getByRole('button', {name: /^Fund A 1 /}).first().getByText('Fund A 1', {exact:true}).click();
  await expect(dialog.getByText('Fund A 1 is a fictional provider of workflow planning software for small service businesses.', {exact:true}).first()).toBeVisible();
  await page.screenshot({path:info.outputPath('synthetic-company-profile.png')});
  expect(errors).toEqual([]);
});

test('synthetic geographic and industry exposure remains interactive', async ({page}, info) => {
  const external: string[] = [];
  page.on('request', r => {if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url());});
  const {dialog} = await launch(page);
  await dialog.getByText('Geographic Exposure', {exact:true}).scrollIntoViewIfNeeded();
  await dialog.getByRole('button', {name:'Europe', exact:true}).click();
  await dialog.getByRole('button', {name:'Denmark', exact:true}).first().click();
  await expect(dialog.getByText('Denmark companies', {exact:true})).toBeVisible();
  await dialog.getByRole('button', {name:/^Financial Software €/}).click();
  await expect(dialog.getByText('Selected industry', {exact:true})).toBeVisible();
  expect(external).toEqual([]);
  await page.screenshot({path:info.outputPath('synthetic-exposure.png')});
});

for (const invalid of [false,true]) test(`fails closed when the synthetic catalogue is ${invalid?'invalid':'missing'}`, async ({page}) => {
  await page.route('**/src/demo/mock-data/syntheticPortfolio.ts*', route => invalid
    ? route.fulfill({contentType:'text/javascript',body:'export const SYNTHETIC_FUND={}; export const SYNTHETIC_HOLDINGS=[]; export const SYNTHETIC_PORTFOLIO={schemaVersion:"invalid",holdings:[]};'})
    : route.abort());
  await page.goto(previewPath);
  await page.getByRole('button', {name:'Preview synthetic demo'}).click();
  const dialog = page.getByRole('dialog', {name:'Aldea Investor Portal',exact:true});
  await expect(dialog.getByText('Demo temporarily unavailable.', {exact:true})).toBeVisible();
  await expect(dialog.locator('[id^="report-section-"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
