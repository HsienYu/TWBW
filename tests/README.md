# Tests

## Automated suite
Run `npm test` from the project root, or `node --test tests/*.test.js`. No third-party packages are required. The existing three Bun map-link cases have been converted without changing their assertions.

Capture complete stdout and stderr when verifying a change:

```sh
mkdir -p /tmp/twbw-compass-verification
npm test > /tmp/twbw-compass-verification/full-suite.log 2>&1
```

Check the command's exit status and read the complete output, including failures.

## Coverage

- `mobile-notice.test.js`: desktop QR markup and asset, English/Traditional Chinese scan instructions, desktop notice visibility and preserved phone/touch-iPad entry.
- `works-map-link.test.js`: existing coordinate-link behavior, absent data and malformed/out-of-range input.
- `navigation.test.js`: four directions, date-line crossing, invalid/coincident/antipodal coordinates, signed angle wrapping, absolute heading, Safari heading, screen rotation and posture rejection.
- `compass.test.js`: click-driven permission, denied/unsupported/error paths, expiry, background reset, relative-event rejection, target change, arrival and cleanup.
- `i18n.test.js`: preference ordering, region variants, Traditional Chinese mapping, malicious/unsupported values, dictionary/placeholder parity, persisted selection and storage failure.
- `helpers/browser.js`: synthetic event target, clock and timer fixture; no real browser or sensor access.

The suite should cover success, boundary and failure paths of pure logic and sensor lifecycle. Hardware accuracy is intentionally outside unit-test claims.

## Browser acceptance
`browser/acceptance.js` is a Playwright callback accepted by the Playwright MCP `browser_run_code_unsafe` tool's `filename` parameter. It creates and closes its own browser context. It does not require Playwright to be installed in this repository.

1. From the project root, run `python3 tests/helpers/serve.py 8765`. This test-only server binds to loopback and serves the same static files at `/` and `/TWBW/`.
2. Run `browser/acceptance.js` with that tool, using the file's absolute path.
3. Inspect the result and `/tmp/twbw-compass-verification/browser.log`. Screenshots are saved as `compass-root.png` and `compass-subpath.png` in the same directory.
4. Stop the test server when finished.

The test intercepts all non-local traffic, replaces the production HTTPS redirect only within its route fixture, and supplies synthetic location, orientation, camera stream, arrival, upload and gallery responses. It validates preserved fallback journey fields without printing sessions or request bodies. Browser-generated sensor events are filtered only in the fixture, so injected readings are deterministic. CDN responses are stubbed; this exercises local CSS without relying on network availability.

Acceptance includes navigation, dynamic language switching without camera restart or duplicate API calls, permissions and failure states, original gallery content preservation, relative navigation links, and no horizontal overflow at a 390px viewport.

Run `browser/language-alignment.js` through the same Playwright tool and loopback server for the language-control layout regression. Unlike the synthetic journey test, it loads the real Bootstrap 4.5.2 stylesheet and requires its default 8px label margin to be present. It checks label/select vertical centers within 0.5px and no horizontal overflow at 320px, 390px and 768px, on both pages and in both languages. Output is saved to `/tmp/twbw-compass-verification/language-alignment.log`. This catches Bootstrap Reboot label spacing that a stubbed CDN stylesheet would miss.

For the desktop QR regression, start the same loopback server and run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser/mobile-notice.js
```

This uses installed Chromium at `/usr/bin/chromium`, verifies root/project-prefix URLs at 320px and 1280px in both languages, checks image loading and overflow, and confirms the phone entry. Only the HTTP-to-HTTPS redirect is bypassed for loopback testing. Screenshots go to `/tmp/twbw-qr-verification/`. Decode the supplied asset with `zbarimg --quiet src/assets/therewillbeworks_qrcode.png`; it must resolve to `https://therewillbeworks.com`.

## Manual acceptance
`manual/compass.md` defines HTTPS tests for actual iOS Safari and Android Chrome. Record device/browser versions, calibration error, latency, recovery and anonymized evidence. This remains pending until physical phones have been tested.

No tests may upload real photos or send real location data to the production API.
