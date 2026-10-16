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
