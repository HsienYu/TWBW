import { test } from "node:test";
import assert from "node:assert/strict";
import { mapLinkForCoordinates } from "../pages/works-map-link.js";

test("creates a Google Maps link for valid coordinates", () => {
  assert.deepEqual(mapLinkForCoordinates("25.0330, 121.5654"), {
    label: "25.033, 121.5654",
    href: "https://www.google.com/maps/search/?api=1&query=25.033%2C121.5654",
  });
});

test("does not create a link when coordinates are absent", () => {
  assert.equal(mapLinkForCoordinates(), null);
});

test("does not create a link for malformed or out-of-range coordinates", () => {
  assert.equal(mapLinkForCoordinates("not-a-coordinate"), null);
  assert.equal(mapLinkForCoordinates("91, 121.5654"), null);
  assert.equal(mapLinkForCoordinates("25.0330, 181"), null);
});
