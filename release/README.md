# Production releases

The September incident came from creating a checkout at an old commit and copying selected files: that silently omitted fixes already running in production. A clean Git worktree alone does not prevent this.

Start every feature from the latest deployed source snapshot. Preserve other working changes. Do not assemble a release by copying selected files onto an older checkout. The currently reconciled release workspace is `timekeeping-live`; the original dirty repository contains additional unrelated work and must not be deployed wholesale.

The restored September 29 release is saved on `codex/production-baseline-2026-09-29`. Start the next feature branch/worktree from that release (or a newer verified release), not the older `main` commit. The original working directory remains untouched by this release branch; reconcile its independent changes feature by feature.

`hosting-baseline.json` records hashes of the last deployed frontend source, assets, dependencies, environment files and Firebase config. Environment values are never stored, only hashes. Keep this baseline and the deployment receipt with the release source in version control when committing a release. Never regenerate the baseline just to make the guard pass.

For each feature, update `hosting-plan.json` with its purpose, current baseline asset, and exact allowed file paths. Review all listed changes. Broad wildcard scopes are rejected. If a shared dependency must change, list and review it explicitly.

Run `node scripts/releaseHosting.cjs check` to identify unexpected changes. Run `node scripts/releaseHosting.cjs deploy` for production. It checks the live baseline, runs guard tests and the full frontend test suite, builds, and deploys only Hosting. The Firebase predeploy hook blocks direct deploys without a matching tested artifact. Any source, configuration or build change after preparation requires preparing again. After live verification, it records a receipt and advances the baseline automatically. Prepared stamps are local artifacts and must not be committed.

If verification after upload fails, inspect the live asset and deployment status before another release. Do not overwrite a newer release or advance the baseline without evidence. Previous receipts preserve the old baseline and identify the release to roll back through Firebase Hosting release history if necessary.

Backend fixes use targeted `--only functions:<name>` deployments after backend tests; never deploy all functions or rules for a frontend change. Data repairs are separate from code deployment and must be based on identified records. This guard enforces frontend feature scope and artifact consistency; it does not replace reviewing the permitted changes or testing signed-in workflows.

## October 22 reconciliation

`codex/reconcile-production-school-year` starts from the complete October production inputs whose hashes match `/assets/index-DbVWxOJ9.js`, confirmed live again after the rollback. It merges current `main` (including PR #58) into that source. The diff against main is intentionally larger than the report feature: main was missing already-deployed timekeeping, enrollment, and Act as teacher changes. Backend/rules sources are restored from the matching October 18 receipt; this PR does not request deploying them.

GitHub PR and main workflows now validate scope, tests, and build only. They do not deploy Hosting or create preview channels. Production releases must use the guarded local command above, after reviewing the exact plan and signed-in behavior. Preserve and commit the updated receipt and baseline after a successful release.

The school-year feature needs a separate, deliberate data action after release: verify the start date and recalculate student attendance from September 2, 2026. Check the Grade 8 course teacher field. Do not use the year-end archive to repair current-year totals. Archive retries now skip completed students transactionally so a partial failure cannot replace their saved totals with zeroes.
