# Report persistence and reporting-period isolation

Production baseline: `/assets/index-Q-gQNk2P.js`, retained without regeneration. The release plan lists the exact 17 changed source/test paths. No backend or rules deployment is needed.

## Behavior

- Admin Review, My Progress, and Past Report Cards open in the configured current school year and default term. Selecting all terms remains inside one year. Counts and bulk approval sources use that period.
- Earlier years are explicitly selectable. Historical drafts can be previewed alongside saved PDFs; they cannot be edited as current-year work. No records are moved, deleted, or bulk-retagged.
- Explicit school-year metadata wins. Legacy records use stable creation/completion dates, never a recent review/modification date. Missing dates or terms stay visible in labeled unclassified groups. A reviewed old report cannot become a new-year report just because its modification timestamp changed.
- New draft IDs include student, report type, school year, and term. The identity is shared across teachers. Current-year legacy IDs remain editable in place after scope validation, preserving their history and creation date.
- Saves use Firestore transactions and content/version checks. Another teacher's intervening save causes a visible conflict, retaining the local edits. Original ownership is preserved; contributor IDs keep shared work visible in both teachers' lists.
- Browser recovery copies are isolated by login/student/report/year/term. Saved cloud work is authoritative when reopening. Unsaved changes get navigation warnings and an explicit recovery action; ambiguous old browser caches are not applied to current-year reports.
- Finalization, approval, and reapproval validate the exact period and draft revision. The published record and draft status commit together. Failed cloud publication cannot report success or mark a draft complete. Reapproval cannot overwrite a different year's or term's published record.
- Existing same-year Term 1 carry-forward into Term 2 remains supported; the Term 1 editor no longer falls back to Term 2 content.

## Validation

- 438 frontend tests pass, including actual ReportCard editor tests with mocked cloud boundaries: Teacher A saves, Teacher B reopens and edits, previous-year data remains unchanged, Term 2 does not populate fresh Term 1, both term saves remain separate, and a failed save stays on screen and succeeds on retry.
- Transaction tests exercise all seven report types, repeated saves, field clearing, revision history, collaborative edits, stale writers, consolidation conflicts, legacy IDs, failed writes, and atomic publication/reapproval boundaries.
- The complete scoped release preparation checks the current live baseline, exact file list, release-guard tests, full frontend suite, and production build.
- The period controls were inspected at desktop and 390px mobile sizes using synthetic records. Historical-year selection showed only historical records. The Impeccable mechanical detector returned no findings for the changed list controls/views.
- The existing TimesheetApprovals test now mocks Firebase initialization so it cannot make analytics network requests during test collection.

No production records were written, no live teacher submissions were made, and this change has not been deployed. These tests exercise the real editor with mocked cloud calls, not every teacher's device/account. Signed-in smoke checks before release should save/reopen a test report as a teacher, verify a second teacher sees shared work, verify admin approval within the selected period, and confirm historical previews and current-year empty states using actual metadata.
