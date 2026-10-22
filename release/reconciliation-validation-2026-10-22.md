# October 22 reconciliation validation

- Production rollback verified at `https://tlasms.com`: `/assets/index-DbVWxOJ9.js`.
- All deployment inputs in the saved production manifest matched the release workspace before merging main.
- Started from the full production snapshot, including recorded frontend changes and receipt-verified backend/rules source, then merged `main` at `812aec691e9a389517b4ddaf691cc16907542234`.
- The approved scope contains 27 report/school-year paths plus `yarn.lock`. The lockfile repair records the already-deployed ExcelJS/JSZip dependencies missing from the old lockfile; no dependency ranges were changed. The original baseline manifest was retained, not regenerated.
- `node --test scripts/releaseHosting.test.cjs functions/*.test.js`: 35 passed.
- Guarded `node scripts/releaseHosting.cjs prepare`: passed live baseline/scope verification, release-guard tests, 409 frontend tests, production build, and exact input/artifact verification.
- Prepared frontend asset: `/assets/index-Drdx0UHl.js` (not deployed).
- Archive regression tests cover failure after the first completed chunk and failure of the final school-year settings save; retries retain the original archived totals.
- Fresh dependency installation and frozen-lockfile reinstall passed after the lockfile repair. All tests and guarded preparation passed again, producing the same prepared asset.
- `git diff --check`: passed.

The production build reports existing warnings about the duplicate `student` key in fieldMappings, browser compatibility data, and large chunks. These did not fail the build.

No production deployment, attendance recalculation, archive, database repair, or signed-in attendance submission was performed. Signed-in check-in, Act as teacher, enrollment, report selection, and the real Grade 8/JK records still require release smoke verification. The previously reported network stall is not claimed fixed by this reconciliation.

CI now validates without automatic deployment. Use the existing scoped release command for an explicitly requested production release; do not reintroduce a direct merge-to-Hosting action.
