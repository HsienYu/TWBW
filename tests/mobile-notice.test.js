import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { messages } from '../src/js/locales.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../src/js/script.js', import.meta.url), 'utf8');

test('desktop notice contains a persistent QR image and separate localized instructions', () => {
    const notice = html.match(/<section\b[^>]*id="mobile-notice"[^>]*hidden[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(notice, 'desktop notice must wrap text and image without translating away its children');
    assert.match(notice, /data-i18n="mobileOnly"/);
    assert.match(notice, /data-i18n="scanToOpen"/);
    assert.match(notice, /<img[^>]*src="\.\/src\/assets\/therewillbeworks_qrcode.png"[^>]*alt="[^"]+"/);
    const image = readFileSync(new URL('../src/assets/therewillbeworks_qrcode.png', import.meta.url));
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
    assert.equal(messages.en.scanToOpen, 'Scan this QR code with your phone to open the website.');
    assert.equal(messages['zh-TW'].scanToOpen, '請用手機掃描 QR code，開啟網站。');
});

test('desktop shows the notice without starting the journey; phones and touch iPads keep their entry', () => {
    // Execute the real entry branch; the unrelated sensor/camera journey is a boundary stub.
    const entry = script.slice(0, script.indexOf('function startJourney()')).replace(/^import .*;\n/gm, '');
    for (const [navigator, mobile] of [
        [{ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }, false],
        [{ userAgent: 'Mozilla/5.0 (iPhone) Mobile' }, true],
        [{ userAgent: 'Mozilla/5.0 Android' }, true],
        [{ userAgent: 'Mozilla/5.0 Macintosh', platform: 'MacIntel', maxTouchPoints: 5 }, true]
    ]) {
        const nodes = { 'landing-page': { hidden: false }, 'mobile-notice': { hidden: true } };
        let starts = 0;
        runInNewContext(entry, {
            window: {}, navigator, document: { getElementById: id => nodes[id] },
            createI18n: () => ({}), bindLanguageUI() {}, startJourney() { starts++; }
        });
        assert.equal(nodes['mobile-notice'].hidden, mobile);
        assert.equal(nodes['landing-page'].hidden, !mobile);
        assert.equal(starts, Number(mobile));
    }
});
