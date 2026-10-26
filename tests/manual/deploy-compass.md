# Compass Pages rollout

## Authorization and scope
Prepared 2026-10-16 15:57:04 CEST. The user explicitly authorized this session's commit, push to main and production Pages deployment. The user accepted that active visitors cannot be established from the available Pages APIs and that physical-phone testing remains pending. This is a one-run exception, not a general waiver.

Only static frontend files are deployed. No backend changes, production photo uploads or location POSTs are part of agent verification. The user will test the physical phone after publication.

## Baseline and stop gates
- Repository: `HsienYu/TWBW`.
- Pages source must remain `main`, `/`, legacy branch build.
- Remote main and current published build must both be `85e1f1370c1c30d20d2d3b5fbf32496382ab6eeb`.
- HTTPS `https://therewillbeworks.com/` must return 200 with a valid certificate.
- Node suite must report 22 tests, 22 passed, 0 failed, 0 skipped.
- `git diff --check` must exit 0; Gitleaks must report 0 leaks.
- Backup ref `backup/pre-compass-20261016` must not already exist before creation, then must point to the baseline SHA.
- Any unexpected SHA, changed source configuration, failed check or concurrent edit aborts the next write. No force pushes or hook bypasses.

## Rollout
Run from the isolated `compass-guidance` worktree. These commands were checked against installed Git, GitHub CLI, Node and Gitleaks before the run.

1. Run `npm test`, `git diff --check`, and `gitleaks dir . --redact --no-banner`. Save complete output outside the repository.
2. Verify `git ls-remote --heads origin refs/heads/main` and `gh api repos/HsienYu/TWBW/pages`. Expect the baseline and source above.
3. Create the backup ref at the baseline and push that ref only. Verify its remote SHA before publishing.
4. Stage only reviewed source, tests and documentation. Commit with a descriptive message and `Co-Authored-By: Warp <agent@warp.dev>`. Record the release SHA.
5. Recheck remote main still equals the baseline, then `git push origin HEAD:refs/heads/main`. This must be a normal fast-forward push.
6. GitHub Pages builds a versioned artifact and publishes it through its managed deployment. Follow the `pages build and deployment` run for the release SHA using `gh run watch <run-id> --repo HsienYu/TWBW --exit-status`. Expect success.
7. Query the latest Pages build. Expect `built`, no error and the exact release SHA. Verify deployed HTML, CSS and JS bytes against the committed release, allowing the Pages-generated HTML metadata prefix.
8. Open the real HTTPS page with a mobile browser context; verify language switching and that the main interface loads. Block backend API requests during agent verification and do not grant/send real location or camera data.
9. Fast-forward the clean local main checkout only if it has no intervening edits. Keep the remote backup until the user accepts the release.

## Rollback
Do not rewrite history or force-push. If publication fails, stop and report; verify what remains live before making another change.

To restore the previous frontend after a confirmed release regression, create a new rollback worktree from current remote main. Verify that main still equals the recorded release and that the backup points to the baseline. Revert the single release commit with `git revert --no-commit <release-sha>`, then commit the revert with the Warp co-author line and push normally to main. Wait for the resulting Pages deployment and re-run the live checks. If main has moved since the release, stop and review the intervening changes instead of reverting blindly.

## Evidence
Pre-release and live evidence is saved under `/tmp/twbw-compass-verification/`:
- `predeploy-tests.log`: complete test output.
- `predeploy-secrets.log`: redacted Gitleaks output.
- `deployment.log`: Pages build/run status and release SHA.
- `live-verification.json`: live HTTPS status and content hash comparison, without user data.

The execution results are also recorded in the tool-native implementation plan. Physical iOS/Android evidence remains separate in `compass.md`; publication does not imply sensor acceptance.

## Follow-up: language alignment
Prepared 2026-10-16 16:22:56 CEST. The user separately approved commit/push and publication of the layout correction, then requested the next work items. This approval is specific to this CSS correction; it does not authorize unrelated changes. The previously disclosed lack of a reliable Pages active-visitor signal remains; no idle-visitor claim is made.

Use the same rollout and non-destructive rollback steps above with these replacement gates:
- Baseline main and published build: `35f800cf2440a5e5485d56d0d574febba81cf93e`.
- New backup ref: `backup/pre-alignment-20261016`, pointing to that baseline.
- Scope: clear the language label margin, add the browser regression test, and update test/runbook documentation. No JavaScript application behavior or backend changes.
- Tests: 22 Node tests pass; 12 browser combinations pass (both pages, English/Traditional Chinese, widths 320/390/768). Real Bootstrap CSS must be loaded. Before the fix the label center was 4px above the select; after the fix the expected difference is 0px, with tolerance 0.5px.
- Live gate: the published CSS must match the committed file and the real HTTPS interface must have label/select center difference within 0.5px. Do not submit location or photos during verification.
- Evidence: `alignment-full-suite.log`, `language-alignment-red.log`, `language-alignment.log`, `alignment-secrets.log`, `alignment-deployment.json` and `alignment-live.json` under `/tmp/twbw-compass-verification/`.

Remaining acceptance is physical-phone confirmation, not another feature rollout: recheck the visible language row, then record device/browser details and compass behavior from `compass.md`. The user's initial report that navigation appears usable is preliminary feedback, not evidence that every manual case passed.

## Follow-up: desktop QR code

Prepared 2026-10-26 17:51:53 CET. The user authorized commit, merge and push for this change. Workflow: deployment verification. The separate current-run activity-gate exception must be explicitly accepted before pushing; no standing exception is assumed.

Stop at the first mismatch. Expected baseline main and published build: `68b387eabcbf5f840c6f998d0f1f5390a7398e37`. Expected Pages source: `main`, `/`, legacy branch build. Scope is the supplied QR PNG, desktop notice, translations, layout, tests and documentation; no backend or data changes.

1. `npm test` must pass 24 tests with 0 failures and 0 skipped. `git diff --check` must exit 0; `gitleaks dir . --redact --no-banner` must report no leaks. Review the entire diff, including new files.
2. `git ls-remote --heads origin refs/heads/main` and `gh api repos/HsienYu/TWBW/pages/builds/latest` must match the baseline; `gh api repos/HsienYu/TWBW/pages` must match the source above. All commands are installed and were executed successfully before this run.
3. Commit only reviewed change files on `feat/desktop-qr`, then fast-forward local main with `git merge --ff-only feat/desktop-qr`. Untracked `.orca/` and local `PLAN.md` remain outside the release.
4. Before any production push, require the user's explicit current-run exception to the unavailable Pages visitor signal. Without that response, abort the push and leave the release local. Create `backup/pre-desktop-qr-20261026` at the baseline; push this backup and verify its remote SHA.
5. Recheck remote main equals the baseline; use a normal fast-forward `git push origin main:main`. GitHub Pages creates a versioned deployment artifact and publishes it through its managed deployment. No history rewrite or hook bypass.
6. `gh run list --repo HsienYu/TWBW --limit 5 --json databaseId,headSha,status,conclusion` identifies the release run; `gh run watch <run-id> --repo HsienYu/TWBW --exit-status` must succeed. Latest Pages build must report `built`, the release SHA, and no error.
7. Check real HTTPS HTML and QR/CSS/locales resources against local committed bytes (allow Pages-generated HTML metadata). In Chromium, verify desktop notice visible, PNG loaded at 296px, both language prompts correct, no overflow at 320/1280px, and phone landing visible with desktop notice hidden. Block backend requests; do not click Start or send location/photos. Save screenshots and logs under `/tmp/twbw-qr-verification/`.

Rollback: keep the remote backup until user acceptance. For a confirmed regression, create an isolated rollback branch/worktree at the release SHA, revert the single release commit normally, run all tests and review the diff, then obtain authorization for that rollback run and push normally. Verify Pages deployment and live resources again. Stop if remote main moved; never reset or force-push.

Evidence: `/tmp/twbw-qr-prepublish-tests.log` (full Node output), `/tmp/twbw-qr-secrets.log` (redacted scan), and local browser screenshots/results documented in the root handoff. Publication results will be recorded in the local `PLAN.md` Handoff Log after live verification.
