export function mapLinkForCoordinates(value) {
    if (typeof value !== "string") return null;

    const parts = value.split(",").map((part) => part.trim());
    if (parts.length !== 2 || parts.some((part) => !part)) return null;

    const [latitude, longitude] = parts.map(Number);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }

    const label = `${latitude}, ${longitude}`;
    return {
        label,
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`,
    };
}
