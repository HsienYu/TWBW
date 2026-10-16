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

## Manual acceptance
`manual/compass.md` defines HTTPS tests for actual iOS Safari and Android Chrome. Record device/browser versions, calibration error, latency, recovery and anonymized evidence. This remains pending until physical phones have been tested.

No tests may upload real photos or send real location data to the production API.
