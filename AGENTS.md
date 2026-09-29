# Release safety

Production is a whole-app Hosting artifact. A feature worktree must start from the latest deployed source, not merely the repository's HEAD. Never rebuild an old checkout with a hand-picked set of feature files: that can erase unrelated fixes.

Before changing deployment inputs, read `release/README.md`, inspect `release/hosting-baseline.json`, and confirm its asset matches production. Preserve dirty user work. Review the exact file list in `release/hosting-plan.json`; do not widen scope to conceal unexpected changes or regenerate the baseline to bypass a failure.

Use `node scripts/releaseHosting.cjs deploy` for Hosting releases. The mandatory Firebase predeploy hook verifies the feature scope, passing frontend tests, exact build inputs, artifact hashes and current production baseline. Keep the hook enabled. If a different checkout fails the guard, reconcile it with the deployed source before continuing.

Deploy backend changes only with the specific `functions:<name>` target after backend tests. Frontend fixes do not authorize rules, database writes or broad function deployments. Record the verified live asset and retain the release receipt. Report any signed-in workflow that could not be exercised directly.
