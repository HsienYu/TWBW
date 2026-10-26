// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright index.mjs.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const evidence = '/tmp/twbw-qr-verification';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
let cases = 0;
try {
    for (const prefix of ['', '/TWBW']) {
        for (const width of [320, 1280]) {
            const context = await browser.newContext({ viewport: { width, height: 800 } });
            await context.route('**/src/js/redirect.js', route => route.fulfill({ body: '' }));
            await context.route('https://data.therewillbeworks.com/**', () => { throw new Error('Unexpected production request'); });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(`http://127.0.0.1:8765${prefix}/`);
            for (const locale of ['en', 'zh-TW']) {
                await page.selectOption('#language-select', locale);
                await page.locator('#mobile-notice').waitFor({ state: 'visible' });
                assert.equal(await page.locator('#landing-page').isVisible(), false);
                assert.equal(await page.locator('#mobile-notice [data-i18n="scanToOpen"]').textContent(), locale === 'en'
                    ? 'Scan this QR code with your phone to open the website.' : '請用手機掃描 QR code，開啟網站。');
                const image = await page.locator('#mobile-notice img').evaluate(img => ({
                    loaded: img.complete && img.naturalWidth === 888,
                    width: img.getBoundingClientRect().width,
                    overflow: document.documentElement.scrollWidth > innerWidth
                }));
                assert.equal(image.loaded, true);
                assert.equal(image.overflow, false);
                assert.ok(image.width >= 280 && image.width <= 296);
                assert.deepEqual(errors, []);
                cases++;
                await page.screenshot({ path: `${evidence}/${prefix ? 'subpath' : 'root'}-${width}-${locale}.png` });
            }
            await context.close();
        }
    }
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
    });
    await context.route('**/src/js/redirect.js', route => route.fulfill({ body: '' }));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/');
    await page.locator('#start-button').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#mobile-notice').isVisible(), false);
    cases++;
    await context.close();
    console.log(`Browser checks: ${cases} passed, 0 failed (desktop root/subpath, two widths, two languages; mobile entry).`);
} finally {
    await browser.close();
}
