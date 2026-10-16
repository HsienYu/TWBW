import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearingTo, headingFromEvent, relativeRotation } from '../src/js/navigation.js';

const origin = { latitude: 0, longitude: 0 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.01, `${actual} != ${expected}`);

test('bearings point north, east, south and west', () => {
    for (const [latitude, longitude, expected] of [[1, 0, 0], [0, 1, 90], [-1, 0, 180], [0, -1, 270]]) {
        near(bearingTo(origin, { latitude, longitude }), expected);
    }
});
test('bearing follows the short path across the date line', () => {
    near(bearingTo({ latitude: 0, longitude: 179 }, { latitude: 0, longitude: -179 }), 90);
});
test('invalid coordinates, identical and antipodal locations have no unique direction', () => {
    for (const target of [null, {}, { latitude: '1', longitude: 0 }, { latitude: 91, longitude: 0 },
        { latitude: 0, longitude: 181 }, { latitude: NaN, longitude: 0 }, origin,
        { latitude: 0, longitude: 180 }, { latitude: Infinity, longitude: 0 }]) {
        assert.equal(bearingTo(origin, target), null);
    }
    assert.equal(bearingTo(null, origin), null);
});
test('relative rotation is signed and wraps through north', () => {
    assert.equal(relativeRotation(1, 359), 2);
    assert.equal(relativeRotation(359, 1), -2);
    assert.equal(relativeRotation(0, 90), -90);
    assert.equal(relativeRotation(null, 90), null);
});
test('absolute Android orientation and screen rotation produce compass heading', () => {
    const event = { absolute: true, alpha: 270, beta: 0, gamma: 0 };
    near(headingFromEvent(event, 0), 90);
    near(headingFromEvent(event, 90), 180);
    near(headingFromEvent(event, 270), 0);
    near(headingFromEvent({ ...event, alpha: 0, beta: 20 }, 0), 0);
});
test('Safari heading accepts north zero and compensates landscape', () => {
    const event = { webkitCompassHeading: 0, webkitCompassAccuracy: 10, beta: 0, gamma: 0 };
    assert.equal(headingFromEvent(event, 0), 0);
    assert.equal(headingFromEvent(event, 90), 90);
    assert.equal(headingFromEvent({ ...event, webkitCompassAccuracy: -1 }, 0), null);
    assert.equal(headingFromEvent({ ...event, webkitCompassAccuracy: 60 }, 0), null);
});
test('relative, malformed, upright and screen-down sensor data cannot guide', () => {
    const valid = { absolute: true, alpha: 0, beta: 0, gamma: 0 };
    for (const patch of [{ absolute: false }, { alpha: null }, { alpha: NaN }, { alpha: 361 },
        { beta: 90 }, { beta: 180 }, { gamma: 60 }, { beta: null }, { webkitCompassHeading: -1 }]) {
        assert.equal(headingFromEvent({ ...valid, ...patch }, 0), null);
    }
    assert.equal(headingFromEvent(valid, NaN), null);
});
