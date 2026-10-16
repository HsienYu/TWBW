const radians = degrees => degrees * Math.PI / 180;
const degrees = angle => angle * 180 / Math.PI;
const normalize = angle => ((angle % 360) + 360) % 360;

export function validCoordinates(value) {
    return value != null && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
        && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

export function bearingTo(from, to) {
    if (!validCoordinates(from) || !validCoordinates(to)) return null;
    const delta = radians(to.longitude - from.longitude);
    const first = radians(from.latitude);
    const second = radians(to.latitude);
    const east = Math.sin(delta) * Math.cos(second);
    const north = Math.cos(first) * Math.sin(second) - Math.sin(first) * Math.cos(second) * Math.cos(delta);
    // Coincident and antipodal points do not define a unique initial bearing.
    if (Math.hypot(east, north) < 1e-12) return null;
    return normalize(degrees(Math.atan2(east, north)));
}

export function relativeRotation(bearing, heading) {
    if (!Number.isFinite(bearing) || !Number.isFinite(heading)) return null;
    return normalize(bearing - heading + 180) - 180;
}

export function headingFromEvent(event, screenAngle = 0) {
    if (!Number.isFinite(screenAngle) || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)
        || Math.abs(event.beta) > 30 || Math.abs(event.gamma) > 30) return null;
    if (event.webkitCompassHeading !== undefined) {
        const heading = event.webkitCompassHeading;
        const accuracy = event.webkitCompassAccuracy;
        if (!Number.isFinite(heading) || heading < 0 || heading > 360
            || (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 30))) return null;
        return normalize(heading + screenAngle);
    }
    if (event.absolute !== true || !Number.isFinite(event.alpha) || event.alpha < 0 || event.alpha >= 360) return null;
    // W3C Z-X'-Y'' rotation: project the current screen's top edge onto Earth's horizontal plane.
    // Device axes do not rotate when the UI switches between portrait and landscape.
    const a = radians(event.alpha), b = radians(event.beta), g = radians(event.gamma), s = radians(screenAngle);
    const x = Math.cos(g) * Math.sin(s);
    const y = Math.sin(b) * Math.sin(g) * Math.sin(s) + Math.cos(b) * Math.cos(s);
    const east = Math.cos(a) * x - Math.sin(a) * y;
    const north = Math.sin(a) * x + Math.cos(a) * y;
    return normalize(degrees(Math.atan2(east, north)));
}
