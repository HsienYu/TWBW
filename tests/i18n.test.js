import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createI18n, resolveLocale, messages } from '../src/js/i18n.js';
import { FakeBrowser } from './helpers/browser.js';

test('locale resolution respects preferences, overrides and safe fallbacks', () => {
    assert.equal(resolveLocale(['de-DE', 'zh-TW', 'en']), 'zh-TW');
    assert.equal(resolveLocale(['en-GB', 'zh-TW']), 'en');
    assert.equal(resolveLocale(['ja']), 'en');
    assert.equal(resolveLocale(['en'], 'zh-TW'), 'zh-TW');
    assert.equal(resolveLocale(['zh-TW'], '../../bad.js'), 'zh-TW');
    for (const locale of ['zh', 'zh-CN', 'zh-Hans', 'zh-HK', 'zh-Hant-TW']) {
        assert.equal(resolveLocale([locale]), 'zh-TW');
    }
    for (const input of [null, [], [null, {}, '__proto__', '<script>'], ['en<script>']]) {
        assert.equal(resolveLocale(input), 'en');
    }
});
test('all languages provide the same keys and interpolation variables', () => {
    assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-TW']).sort());
    for (const key of Object.keys(messages.en)) {
        assert.equal(typeof messages['zh-TW'][key], 'string');
        assert.deepEqual(messages.en[key].match(/\{\w+\}/g)?.sort(), messages['zh-TW'][key].match(/\{\w+\}/g)?.sort(), key);
    }
});
test('manual selection persists and automatic selection responds to languagechange', () => {
    const browser = new FakeBrowser();
    const saved = new Map();
    const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
    const i18n = createI18n({ window: browser, storage });
    let changes = 0;
    i18n.subscribe(() => changes++);
    i18n.setLocale('zh-TW');
    assert.equal(i18n.locale, 'zh-TW');
    assert.equal(i18n.t('start'), '開始');
    assert.equal(createI18n({ window: browser, storage }).locale, 'zh-TW');
    browser.emit('languagechange');
    assert.equal(i18n.locale, 'zh-TW');
    i18n.setLocale('auto');
    assert.equal(i18n.locale, 'en');
    browser.navigator.languages = ['zh-HK'];
    browser.emit('languagechange');
    assert.equal(i18n.locale, 'zh-TW');
    assert.ok(changes >= 3);
    i18n.destroy();
});
test('storage failures and hostile overrides do not break translation', () => {
    const browser = new FakeBrowser();
    const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    const i18n = createI18n({ window: browser, storage });
    i18n.setLocale('zh-TW');
    assert.equal(i18n.locale, 'zh-TW');
    i18n.setLocale('__proto__');
    assert.equal(i18n.locale, 'zh-TW');
    assert.ok(i18n.t('distance', { distance: '123' }).includes('123'));
    i18n.destroy();
});
