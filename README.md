# There Will Be Works

A mobile artwork journey: find a nearby target, follow direction and distance, receive location instructions, take a photo and view the gallery.

## Run and deploy
The site is plain HTML, CSS and browser ES modules. Publish the repository's static files to GitHub Pages as before. No build, package installation, Node.js server or Bun runtime is required. `package.json` is only for development tests.

Keep `index.html`, `pages/` and `src/` together. Local module and page links are relative, supporting both a custom domain and a project prefix such as `/TWBW/`. Keep the existing `CNAME` for the custom domain. Enable HTTPS in Pages: location, camera and orientation require a secure context. `src/js/redirect.js` retains the existing HTTP-to-HTTPS redirect.

The existing remote data API is unchanged. Ordinary use sends location and photo data to that API as before; compass readings and language preferences are not sent to a new service.

## Navigation
1. Open the site on a phone and tap Start. GPS updates are requested every five seconds after starting.
2. Tap **Enable direction guidance** and grant orientation permission if prompted.
3. Hold the phone approximately flat, screen upward, and rotate it until the arrow points forward.
4. Follow the existing arrival instructions, photo and upload flow.

The arrow indicates a **straight-line bearing, not a walking route**. It cannot identify roads, obstacles or safe access. Magnetic interference, magnetic versus geographic north, location accuracy and browser/device support can affect direction. Real-device calibration is still necessary.

Only Safari compass headings or absolute device orientation are used. Relative rotation and GPS travel heading are not substitutes for the direction the phone faces. Devices tilted more than 30 degrees on either axis, unreliable compass accuracy, permission denial or missing sensors hide the arrow. Sensor data expires after five seconds and GPS after fifteen seconds (checked every second). With a valid location but no usable compass, textual bearing and distance remain available. Arrival hides the arrow.

## Languages
English and Traditional Chinese (Taiwan) are currently provided. The first supported entry in `navigator.languages` selects the initial language; unsupported languages fall back to English. All Chinese locale variants use `zh-TW`. This is browser preference detection, not GPS-country detection or automatic translation.

The language selector is available on the landing, journey and gallery pages. Manual selection is stored in local storage; choose Automatic to return to browser preferences. If storage is blocked, the language still works on the current page. Changing language does not reset navigation or the camera.

Translations are in `src/js/locales.js`. Add matching keys and placeholders to each dictionary, then extend the locale allowlist and selector for additional languages. Artwork names, descriptions and backend location instructions retain their original content; backend instructions are labeled accordingly.

## Development tests
Use a maintained Node.js release with `node:test` support (verified with Node.js v26.7.0):

```sh
npm test
```

There are no npm dependencies and no install step. Tests use synthetic coordinates, not personal locations.

See [tests/README.md](tests/README.md) for browser checks and [tests/manual/compass.md](tests/manual/compass.md) for physical-device acceptance.

## Verification status
- Automated math, compass lifecycle and language tests are available alongside the existing map-link regression tests.
- Browser acceptance covers root and project-prefix hosting, language persistence, arrow orientation, location failure, arrival, synthetic camera capture and mocked upload, fallback journey fields and gallery errors.
- Real iOS Safari and Android Chrome sensor verification remains pending. Browser simulation does not prove physical compass accuracy. The user authorized production publication for phone testing; see [the rollout and rollback procedure](tests/manual/deploy-compass.md). Automated verification does not write location or photo data to production.

## 繁體中文摘要
此網站維持 GitHub Pages 純靜態部署，不需要 Node.js 或 Bun 伺服器。Node.js 僅用於開發測試。

開始後可啟用方向指引，將手機平放、螢幕朝上。箭頭只表示目標的直線方向，不代表可步行路線。朝向不可用時顯示文字方位；定位失效時不提供方向。

介面支援英文與臺灣繁體中文，依瀏覽器偏好自動選擇，也可手動切換。其他語言回退至英文，後端作品內容與地點指示保留原文。手機實際感測驗證尚未完成。
