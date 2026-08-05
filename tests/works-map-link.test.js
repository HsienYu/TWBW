import { expect, test } from "bun:test";
import { mapLinkForCoordinates } from "../pages/works-map-link.js";

test("creates a Google Maps link for valid coordinates", () => {
  expect(mapLinkForCoordinates("25.0330, 121.5654")).toEqual({
    label: "25.033, 121.5654",
    href: "https://www.google.com/maps/search/?api=1&query=25.033%2C121.5654",
  });
});

test("does not create a link when coordinates are absent", () => {
  expect(mapLinkForCoordinates()).toBeNull();
});

test("does not create a link for malformed or out-of-range coordinates", () => {
  expect(mapLinkForCoordinates("not-a-coordinate")).toBeNull();
  expect(mapLinkForCoordinates("91, 121.5654")).toBeNull();
  expect(mapLinkForCoordinates("25.0330, 181")).toBeNull();
});
