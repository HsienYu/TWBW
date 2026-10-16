import { bearingTo, headingFromEvent, relativeRotation, validCoordinates } from './navigation.js';

export function createCompass({ window: win, now = Date.now, onChange }) {
    let position = null, target = null, arrived = false;
    let heading = null, headingAt = 0, mode = 'disabled', enabled = false, destroyed = false;
    let permissionPending = false;

    function render() {
        if (destroyed) return;
        let bearing = null, rotation = null, status = mode;
        const age = position ? now() - position.timestamp : Infinity;
        if (arrived) status = 'arrived';
        else if (!validCoordinates(position) || !Number.isFinite(age) || age < 0 || age > 15000) status = 'location';
        else if (!validCoordinates(target)) status = 'target';
        else {
            bearing = bearingTo(position, target);
            if (bearing === null) status = 'nearby';
            else if (win.document.hidden) status = 'waiting';
            else if (enabled && heading !== null && now() - headingAt <= 5000) {
                status = 'tracking';
                rotation = relativeRotation(bearing, heading);
            } else if (enabled && mode !== 'unreliable') status = 'waiting';
        }
        onChange({ status, bearing, rotation, enabled, permissionPending });
    }

    function orientation(event) {
        if (!enabled || destroyed || win.document.hidden) return;
        // A browser may dispatch both relative and absolute events. Never let the relative stream overwrite north.
        if (event.absolute !== true && event.webkitCompassHeading === undefined) return;
        const angle = win.screen?.orientation?.angle ?? win.orientation ?? 0;
        heading = headingFromEvent(event, angle);
        headingAt = now();
        mode = heading === null ? 'unreliable' : 'waiting';
        render();
    }

    function resetHeading() {
        heading = null;
        if (enabled) mode = 'waiting';
        render();
    }

    async function enable() {
        if (destroyed || enabled || permissionPending) return;
        if (!win.isSecureContext || !win.DeviceOrientationEvent) {
            mode = 'unsupported';
            render();
            return;
        }
        permissionPending = true;
        mode = 'requesting';
        render();
        try {
            // Must execute before the first await to preserve the user's transient activation.
            const permission = typeof win.DeviceOrientationEvent.requestPermission === 'function'
                ? await win.DeviceOrientationEvent.requestPermission(true) : 'granted';
            if (destroyed) return;
            if (permission !== 'granted') mode = 'denied';
            else {
                enabled = true;
                mode = 'waiting';
                win.addEventListener('deviceorientationabsolute', orientation);
                win.addEventListener('deviceorientation', orientation);
            }
        } catch {
            // Surface permission failure in the UI; do not log device or location data.
            mode = 'denied';
        } finally {
            permissionPending = false;
            render();
        }
    }

    win.document.addEventListener('visibilitychange', resetHeading);
    win.addEventListener('orientationchange', resetHeading);
    win.screen?.orientation?.addEventListener?.('change', resetHeading);
    const timer = win.setInterval(render, 1000);
    return {
        enable,
        update(nextPosition, nextTarget, reached) {
            position = nextPosition;
            target = nextTarget;
            arrived = reached;
            render();
        },
        invalidatePosition() { position = null; render(); },
        destroy() {
            destroyed = true;
            enabled = false;
            win.clearInterval(timer);
            win.removeEventListener('deviceorientationabsolute', orientation);
            win.removeEventListener('deviceorientation', orientation);
            win.removeEventListener('orientationchange', resetHeading);
            win.screen?.orientation?.removeEventListener?.('change', resetHeading);
            win.document.removeEventListener('visibilitychange', resetHeading);
        }
    };
}
