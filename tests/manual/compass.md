# Mobile compass acceptance
Status: pending real-device verification. Synthetic browser tests do not complete this protocol.

## Setup
- Serve the static site over HTTPS on an iOS Safari phone and an Android Chrome phone.
- Use a test origin with synthetic target responses. Do not upload photos or location data to production.
- Record device, OS, browser version and timestamp with timezone; no personal coordinates or images.
- Choose a safe open area away from traffic, metal and magnetic interference. Compare with a known compass direction.

## Protocol
1. Set browser language to English, then Traditional Chinese. Reload: instructions and controls follow it. Select a different language manually, navigate to the gallery and back: selection persists. Unsupported languages fall back to English.
2. Tap Start and enable direction guidance. Permission must originate from the tap. Test allow, deny and retry; denial leaves distance and textual bearing available without a directional arrow.
3. Hold the phone approximately flat, screen upward. With a synthetic target due north, point the screen top north/east/south/west: arrow points up/left/down/right respectively. Repeat for an eastward target.
4. Rotate slowly across north. The arrow must not animate a long reverse spin. Check portrait and both landscape orientations; compass error should remain within 20 degrees under calibrated outdoor conditions. Sensor/magnetic error may require recalibration; record measured deviation.
5. Tilt the phone upright: hide the arrow and request a flatter posture, rather than showing a misleading heading.
6. Move a synthetic GPS fix and switch the nearest target: distance and bearing update together on the next position callback. A sensor event should update the arrow within 250 ms (record observed latency).
7. Stop sensor events: arrow disappears after 5–6 seconds. Stop GPS updates: arrow and bearing disappear after 15–16 seconds. Deny GPS: both disappear immediately.
8. Background the page, then return: require fresh sensor data before showing an arrow; never reuse the old heading. Verify no duplicate listeners after repeated enable taps.
9. Reach the target and return a successful arrival response: guidance changes to arrived and hides the arrow. Camera capture and upload controls retain their existing sequence. Use mocked upload only.
10. Switch language during navigation, camera preview and upload: do not restart the journey, request location again or interrupt the camera.
11. Load both a domain-root deployment and a `/TWBW/` deployment: scripts, dictionaries and gallery/back links stay within that base.

## Evidence
For each device, record pass/fail for every step, measured direction error and response delay, and anonymized screenshots/log paths. Do not mark this protocol complete until both devices have been exercised. Never substitute simulated orientation for actual sensor evidence.
