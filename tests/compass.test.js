import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCompass } from '../src/js/compass.js';
import { FakeBrowser } from './helpers/browser.js';

function setup() {
    const browser = new FakeBrowser();
    let state;
    const compass = createCompass({ window: browser, now: () => browser.clock, onChange: value => { state = value; } });
    const position = { latitude: 0, longitude: 0, timestamp: browser.clock };
    const target = { latitude: 1, longitude: 0 };
    compass.update(position, target, false);
    return { browser, compass, position, target, get state() { return state; } };
}
test('does not use sensors until enabled; valid data points to target', async () => {
    const s = setup();
    s.browser.orient();
    assert.equal(s.state.status, 'disabled');
    assert.equal(s.state.bearing, 0);
    await s.compass.enable();
    assert.equal(s.state.status, 'waiting');
    s.browser.orient({ alpha: 270 });
    assert.equal(s.state.status, 'tracking');
    assert.equal(s.state.rotation, -90);
    s.compass.destroy();
    assert.equal(s.browser.timers.size, 0);
});
test('permission is requested during enable; denial and errors never show arrow', async () => {
    for (const outcome of ['denied', 'throw']) {
        const s = setup();
        let calls = 0;
        s.browser.DeviceOrientationEvent.requestPermission = absolute => {
            calls++;
            assert.equal(absolute, true);
            return outcome === 'throw' ? Promise.reject(new Error('blocked')) : Promise.resolve(outcome);
        };
        const promise = s.compass.enable();
        assert.equal(calls, 1);
        await promise;
        s.browser.orient();
        assert.equal(s.state.status, 'denied');
        assert.equal(s.state.rotation, null);
        assert.equal(s.state.bearing, 0);
        s.compass.destroy();
    }
});
test('unsupported and insecure browsers retain only textual bearing', async () => {
    for (const patch of [{ DeviceOrientationEvent: undefined }, { isSecureContext: false }]) {
        const s = setup();
        Object.assign(s.browser, patch);
        await s.compass.enable();
        assert.equal(s.state.status, 'unsupported');
        assert.equal(s.state.bearing, 0);
        assert.equal(s.state.rotation, null);
        s.compass.destroy();
    }
});
test('sensor and GPS expiry hide stale directions; fresh input restores them', async () => {
    const s = setup();
    await s.compass.enable();
    s.browser.orient();
    s.browser.advance(6000);
    assert.equal(s.state.status, 'waiting');
    assert.equal(s.state.rotation, null);
    assert.equal(s.state.bearing, 0);
    s.browser.orient();
    assert.equal(s.state.status, 'tracking');
    s.browser.advance(10000);
    assert.equal(s.state.status, 'location');
    assert.equal(s.state.bearing, null);
    s.compass.update({ ...s.position, timestamp: s.browser.clock }, s.target, false);
    s.browser.orient();
    assert.equal(s.state.status, 'tracking');
    s.compass.invalidatePosition();
    assert.equal(s.state.bearing, null);
    s.compass.destroy();
});
test('relative events do not overwrite valid absolute data, invalid absolute data clears it', async () => {
    const s = setup();
    await s.compass.enable();
    s.browser.orient();
    s.browser.emit('deviceorientation', { absolute: false, alpha: 100, beta: 0, gamma: 0 });
    assert.equal(s.state.status, 'tracking');
    s.browser.orient({ beta: 90 });
    assert.equal(s.state.status, 'unreliable');
    assert.equal(s.state.rotation, null);
    s.compass.destroy();
});
test('backgrounding and screen rotation discard previous heading', async () => {
    const s = setup();
    await s.compass.enable();
    s.browser.orient();
    s.browser.visibility(true);
    assert.equal(s.state.rotation, null);
    s.browser.orient();
    assert.equal(s.state.rotation, null);
    s.browser.visibility(false);
    assert.equal(s.state.rotation, null);
    s.browser.orient();
    assert.equal(s.state.status, 'tracking');
    s.browser.emit('orientationchange');
    assert.equal(s.state.rotation, null);
    s.compass.destroy();
});
test('target change, arrival, missing target and zero distance are explicit', async () => {
    const s = setup();
    await s.compass.enable();
    s.browser.orient();
    s.compass.update(s.position, { latitude: 0, longitude: 1 }, false);
    assert.equal(s.state.rotation, 90);
    s.compass.update(s.position, s.target, true);
    assert.equal(s.state.status, 'arrived');
    assert.equal(s.state.rotation, null);
    s.compass.update(s.position, null, false);
    assert.equal(s.state.status, 'target');
    s.compass.update(s.position, s.position, false);
    assert.equal(s.state.status, 'nearby');
    s.compass.destroy();
});
test('repeated enable is idempotent; destroy during permission prevents late activation', async () => {
    const s = setup();
    let resolve;
    let calls = 0;
    s.browser.DeviceOrientationEvent.requestPermission = () => {
        calls++;
        return new Promise(done => { resolve = done; });
    };
    const first = s.compass.enable();
    const second = s.compass.enable();
    assert.equal(calls, 1);
    s.compass.destroy();
    resolve('granted');
    await Promise.all([first, second]);
    s.browser.orient();
    assert.notEqual(s.state.status, 'tracking');
    assert.equal(s.browser.timers.size, 0);
});
