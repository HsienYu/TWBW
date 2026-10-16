async (hostPage) => {
    const context = await hostPage.context().browser().newContext();
    const page = await context.newPage();
    async function saveLog(value) {
        const download = page.waitForEvent('download');
        await page.evaluate(text => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
            link.download = 'browser.log';
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }, value);
        await (await download).saveAs('/tmp/twbw-compass-verification/browser.log');
    }
    try {
        const check = (condition, message) => { if (!condition) throw new Error(message); };
        const results = [];
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width: 390, height: 844 });
        await page.context().addInitScript(() => {
            Object.defineProperty(navigator, 'userAgent', { value: 'Test Android Mobile' });
            Object.defineProperty(navigator, 'languages', { value: ['zh-TW', 'en'], configurable: true });
            window.testPosition = { latitude: 0, longitude: 0, accuracy: 1 };
            window.testLocationError = false;
            Object.defineProperty(navigator, 'geolocation', { value: {
                getCurrentPosition(success, failure) {
                    window.testGpsSuccess = success;
                    window.testGpsFailure = failure;
                    if (window.testLocationError) failure({ code: 1 });
                    else success({ coords: window.testPosition, timestamp: Date.now() });
                }
            } });
            window.DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted');
            const addListener = window.addEventListener.bind(window);
            window.addEventListener = (type, listener, options) => {
                // Only the explicit fixture readings may reach the application during this test.
                if (type === 'deviceorientation' || type === 'deviceorientationabsolute') {
                    addListener(type, event => { if (!event.isTrusted) listener(event); }, options);
                } else addListener(type, listener, options);
            };
            navigator.mediaDevices.getUserMedia = async () => {
                const source = document.createElement('canvas');
                source.width = source.height = 32;
                source.getContext('2d').fillRect(0, 0, 32, 32);
                window.testCameraStream = source.captureStream(1);
                return window.testCameraStream;
            };
        });
        const requests = [];
        await page.route('**/*', route => {
            const url = route.request().url();
            if (url.startsWith('http://127.0.0.1:') && url.endsWith('/src/js/redirect.js')) {
                return route.fulfill({ body: '', contentType: 'text/javascript' });
            }
            if (url.endsWith('/gpt/upload')) {
                const body = route.request().postData();
                check(body.includes('synthetic-fixture-token') && body.includes('synthetic-north'), 'upload lost fallback journey fields');
                requests.push({ path: 'upload' });
                return route.fulfill({ json: { ok: true } });
            }
            if (url.startsWith('http://127.0.0.1:')) return route.continue();
            if (url.endsWith('/gpt/location/targets')) {
                requests.push({ path: 'targets', body: route.request().postDataJSON() });
                return route.fulfill({ json: { journeyType: 'fallback', fallbackToken: 'synthetic-fixture-token', targets: [{ id: 'synthetic-north', latitude: 0.01, longitude: 0, radiusMeters: 10 }] } });
            }
            if (url.endsWith('/gpt/location/next')) {
                requests.push({ path: 'next', body: route.request().postDataJSON() });
                return route.fulfill({ json: { message: 'Synthetic location instruction' } });
            }
            if (url.endsWith('/items/works')) {
                return route.fulfill({ json: { data: [{ id: 'synthetic', date_created: '2026-01-01T00:00:00Z', coordinates: '0, 0', description: 'Synthetic description', photo: 'synthetic' }] } });
            }
            // No production location, media or third-party requests leave this test.
            return route.fulfill({ status: 200, body: '', contentType: url.includes('.css') ? 'text/css' : 'text/plain' });
        });
        for (const base of ['/', '/TWBW/']) {
            await page.goto(`http://127.0.0.1:8765${base}`);
            await page.locator('#language-select').waitFor({ timeout: 4000 });
            await page.locator('#language-select').selectOption('auto');
            check(await page.locator('html').getAttribute('lang') === 'zh-TW', 'browser language not selected');
            check(await page.locator('#start-button').textContent() === '開始', 'start not translated');
            await page.locator('#start-button').click();
            await page.locator('#distance').filter({ hasText: '公尺' }).waitFor();
            check(await page.locator('#compass-arrow').isHidden(), 'arrow visible without orientation');
            const count = requests.length;
            await page.locator('#enable-compass').click();
            await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', {
                absolute: true, alpha: 270, beta: 0, gamma: 0
            })));
            check(await page.locator('#compass-arrow').isVisible(), 'valid absolute heading has no arrow');
            check((await page.locator('#compass-arrow').getAttribute('style')).includes('-90deg'), 'east-facing phone should point left to north');
            await page.locator('#language-select').selectOption('en');
            check(await page.locator('#compass-status').textContent() === 'Turn until the arrow points forward.', 'dynamic compass text not translated');
            check(requests.length === count, 'language switch resent API request');
            await page.screenshot({ path: `/tmp/twbw-compass-verification/compass-${base === '/' ? 'root' : 'subpath'}.png`, fullPage: true });
            check(await page.locator('#compass-arrow').isVisible(), 'arrow disappeared during screenshot');
            check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout overflows horizontally');
            await page.evaluate(() => window.testGpsFailure({ code: 1 }));
            check(await page.locator('#compass-arrow').isHidden(), 'GPS failure left arrow visible');
            check(await page.locator('#bearing').textContent() === '', 'GPS failure left bearing visible');
            await page.evaluate(() => window.testGpsSuccess({ coords: { latitude: 0.01, longitude: 0, accuracy: 1 }, timestamp: Date.now() }));
            await page.locator('#server-message').filter({ hasText: 'Synthetic location instruction' }).waitFor();
            check(await page.locator('#compass-arrow').isHidden(), 'arrival left arrow visible');
            check(await page.locator('#upload-button').isVisible(), 'arrival lost camera action');
            check(requests.findLast(request => request.path === 'next').body.fallbackToken === 'synthetic-fixture-token', 'arrival lost fallback token');
            await page.locator('#upload-button').click();
            await page.waitForFunction(() => document.getElementById('video').videoWidth > 0);
            await page.locator('#language-select').selectOption('zh-TW');
            check(await page.evaluate(() => document.getElementById('video').srcObject === window.testCameraStream
                && window.testCameraStream.getTracks()[0].readyState === 'live'), 'language change restarted camera');
            await page.locator('#upload-button').click();
            await page.locator('#video-container img').waitFor();
            check(await page.locator('#upload-button').textContent() === '上傳照片', 'upload action not localized');
            await page.locator('#language-select').selectOption('en');
            await page.locator('#upload-button').click();
            await page.waitForURL(`http://127.0.0.1:8765${base}pages/works.html`);
            await page.locator('.card-title').waitFor();
            check(await page.locator('html').getAttribute('lang') === 'en', 'language did not persist across pages');
            await page.locator('#language-select').selectOption('zh-TW');
            check((await page.locator('.card-title').textContent()).includes('攝影作品'), 'gallery title not translated');
            check(await page.locator('.card-description').textContent() === 'Synthetic description', 'original content changed');
            await page.locator('.back-button').click();
            check(await page.evaluate(() => location.pathname) === base, 'back link escaped deployment base');
            results.push(`${base}: language, compass, GPS failure, arrival, camera, upload and gallery PASS`);
        }
        await page.goto('http://127.0.0.1:8765/');
        await page.locator('#language-select').selectOption('en');
        await page.locator('#start-button').click();
        await page.locator('#distance').filter({ hasText: 'meters' }).waitFor();
        await page.evaluate(() => { DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied'); });
        await page.locator('#enable-compass').click();
        check((await page.locator('#compass-status').textContent()).includes('not granted'), 'permission denial not visible');
        check(await page.locator('#compass-arrow').isHidden(), 'denied compass shows arrow');
        check((await page.locator('#bearing').textContent()).includes('Target bearing'), 'denial removed textual bearing');
        await page.evaluate(() => { DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted'); });
        await page.locator('#enable-compass').click();
        await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', {
            absolute: false, alpha: 270, beta: 0, gamma: 0
        })));
        check(await page.locator('#compass-arrow').isHidden(), 'relative orientation was treated as compass north');
        await page.evaluate(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', {
            absolute: true, alpha: 0, beta: 90, gamma: 0
        })));
        check((await page.locator('#compass-status').textContent()).includes('flat'), 'upright posture has no useful hint');
        check(await page.locator('#compass-arrow').isHidden(), 'upright phone still has misleading arrow');
        await page.route('**/items/works', route => route.fulfill({ status: 503, json: { error: 'synthetic failure' } }));
        await page.goto('http://127.0.0.1:8765/pages/works.html');
        await page.locator('#gallery-status').filter({ hasText: 'Unable to load' }).waitFor();
        await page.locator('#language-select').selectOption('zh-TW');
        check((await page.locator('#gallery-status').textContent()).includes('無法載入'), 'gallery error does not translate');
        check(await page.locator('.back-button').isVisible(), 'gallery failure traps the user');
        results.push('Permission denial/retry, relative heading rejection, upright posture and localized gallery error PASS');
        check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
        const result = { results, requests: requests.map(({ path }) => path), pageErrors: errors };
        await saveLog(JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        await saveLog(error.stack);
        throw error;
    } finally {
        await context.close();
    }
}
