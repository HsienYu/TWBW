async (hostPage) => {
    const context = await hostPage.context().browser().newContext({
        userAgent: 'Mobile Android layout verification', locale: 'en'
    });
    const page = await context.newPage();
    const results = [];
    async function saveLog(text) {
        const pending = page.waitForEvent('download');
        await page.evaluate(value => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([value], { type: 'text/plain' }));
            link.download = 'language-alignment.log';
            link.click();
        }, text);
        await (await pending).saveAs('/tmp/twbw-compass-verification/language-alignment.log');
    }
    try {
        await page.route('**/src/js/redirect.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
        await page.route('https://data.therewillbeworks.com/**', route => route.fulfill({ json: { data: [] } }));
        for (const path of ['/', '/pages/works.html']) {
            for (const width of [320, 390, 768]) {
                await page.setViewportSize({ width, height: 844 });
                await page.goto(`http://127.0.0.1:8765${path}`);
                await page.locator('#language-select').waitFor();
                if (path === '/') {
                    // Do not stub the real Bootstrap CDN: its label reset caused this regression.
                    const margin = await page.evaluate(() => {
                        const probe = document.createElement('label');
                        document.body.appendChild(probe);
                        const value = getComputedStyle(probe).marginBottom;
                        probe.remove();
                        return value;
                    });
                    if (margin !== '8px') throw new Error(`Bootstrap fixture did not load: label margin ${margin}`);
                }
                for (const language of ['en', 'zh-TW']) {
                    await page.locator('#language-select').selectOption(language);
                    const metrics = await page.evaluate(() => {
                        const label = document.querySelector('.language-control label').getBoundingClientRect();
                        const select = document.querySelector('#language-select').getBoundingClientRect();
                        return {
                            offset: label.y + label.height / 2 - select.y - select.height / 2,
                            overflow: document.documentElement.scrollWidth > innerWidth
                        };
                    });
                    results.push({ path, width, language, ...metrics });
                    if (Math.abs(metrics.offset) > 0.5 || metrics.overflow) {
                        throw new Error(`Language controls misaligned: ${JSON.stringify(results.at(-1))}`);
                    }
                }
            }
        }
        await saveLog(JSON.stringify({ passed: results.length, results }, null, 2));
        return { passed: results.length, results };
    } catch (error) {
        await saveLog(error.stack);
        throw error;
    } finally {
        await context.close();
    }
}
