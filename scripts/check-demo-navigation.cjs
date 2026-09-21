const { createRequire } = require('node:module');
const path = require('node:path');
const { chromium } = createRequire(path.join(process.argv[2], 'package.json'))('playwright');
const origin = process.argv[3] || 'http://localhost:3004';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(origin + '/demo');
      await page.locator('a[href="/demo/fashion"]').click();
      await page.locator('a[href="/demo/fashion/collection"]').click();
      await page.getByRole('link', { name: 'Все товары', exact: true }).click();
      await page.waitForURL('**/demo/fashion/collection/catalog');
      await page.getByRole('heading', { name: 'Все товары' }).waitFor();
      await page.getByRole('link', { name: 'Аксессуары', exact: true }).click();
      await page.getByRole('heading', { name: 'Аксессуары', exact: true }).waitFor();
      await page.getByText('Сумка Daily').first().waitFor();
      if (!(await page.getByRole('link', { name: /Создать свой магазин/ }).isVisible())) throw Error('Missing return');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (overflow) throw Error('Horizontal page overflow at ' + width);
      await page.screenshot({ path: 'output/demo-category-' + width + '.png', fullPage: true });
      await page.goto(origin + '/demo/food/assortment/catalog');
      await page.getByRole('heading', { name: 'Все товары' }).waitFor();
      if ((await page.locator('body').innerText()).includes('Сумка Daily')) throw Error('Mixed demos');
      console.log('PASS demo navigation ' + width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
