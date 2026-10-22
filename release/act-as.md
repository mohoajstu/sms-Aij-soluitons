# Act as teacher

Available at https://tlasms.com for the verified Firebase account `nuralhuda.co@gmail.com`.
This grant is checked on the server; client-writable role records cannot grant it.

## Behavior

The header offers **Act as teacher** to the authorized account. Choose an active
faculty profile and select **Start acting as teacher**. The app reloads all screens
using the teacher's existing Firebase UID and email, including the course,
attendance, report-card and timesheet views. Changes use the teacher's ownership
and normal application permissions. No password is requested or reset.

The teacher identity uses a named Firebase app with memory-only credentials in
this tab. The default Firebase app preserves the administrator's login. Only a
session ID is stored in sessionStorage; reloads require the original authorized
administrator to resume the session. **Return to my admin account** ends the
session, signs out the temporary teacher identity, clears the tab marker and
reloads the administrator's dashboard. Logout during Act as also returns to admin.
Other tabs retain their existing identity.

Sessions last 30 minutes. The UI unmounts school screens at expiry. Firestore,
Storage and authenticated school function paths check the server-managed session
and refuse ended or expired sessions. Ending a session does not revoke the actual
teacher's login. If returning while offline, local credentials are still cleared;
the server session expires at its original deadline.

Inactive, test, unverified, disabled, duplicate-email and administrator targets
are rejected. The teacher needs an existing verified Firebase login; this feature
does not create accounts or change profile roles.

`actAsSessions` is a server-only audit collection recording the administrator,
teacher, start, deadline and explicit end. Timesheet correction history additionally
records `actedByUid` and `actAsSession`. Other existing records continue to use
their current teacher ownership fields; this change does not add a per-mutation
audit log to every collection.

Google Calendar, Sheets and Drive integrations require the teacher's separate
Google OAuth authorization. Act as blocks reuse of the administrator's cached
Google credentials. Registration/login account-management entry points are not
part of the Act as workflow; the password-change route returns to the dashboard.

## Validation and release

The observed production frontend asset before editing was
`/assets/index-DD_2y0VM.js`, matching the recorded baseline. Existing user changes
and the existing Hosting plan were preserved during initial implementation.
The completed deployment is recorded below.

Backend checks:

```sh
node --test functions/actAs.test.js functions/staffTimesheets.test.js functions/registrationEnrollment.test.js
```

Frontend checks:

```sh
npm run test:unit
npm run build -- --outDir /private/tmp/sms-act-as-build
```

Local access checks:

```sh
node scripts/testActAsRules.cjs
```

The access script uses only a `demo-act-as` project and synthetic fixtures in
local Firestore (`127.0.0.1:8186`) and Storage (`127.0.0.1:9295`) emulators. Start
both emulators with the proposed rules. It checks active, forged, missing,
expired and ended sessions; audit protection; and unchanged ordinary teacher
and anonymous registration access. Rules compiled successfully in those emulators.
Previously fetched client data can remain in memory, so expiry unmounts the
teacher UI and returning clears the temporary identity. The script uses fresh
server requests when testing expired reads.

Desktop/mobile component previews use synthetic teacher names. A signed-in
production teacher workflow has not been exercised. Production IAM must permit
the Act as function service account to sign Firebase custom tokens, as described
in [Firebase's custom-token documentation](https://firebase.google.com/docs/auth/admin/create-custom-tokens).

Before a Hosting release, reconcile the feature with the latest observed production asset
and all other dirty work, then prepare an exact Hosting plan under `release/README.md`.
Do not replace the existing plan or regenerate the baseline to bypass a mismatch.
Backend deployment must name individual functions: `actAs`, `staffTimesheets`,
`registrationEnrollment`, `interpretTimekeepingComments`, and `setParentTempPassword`.
Firestore and Storage rule updates are required before enabling the UI. Deploy
Hosting using `node scripts/releaseHosting.cjs deploy` after the required checks.
Do not deploy Hosting alone: server session validation must ship with the feature.

Frontend files introduced or changed by this feature:

- `firebase.json` (Act as API rewrite; retain other existing rewrites)
- `src/App.js`
- `src/Firebase/firebase.js`
- `src/Firebase/useAuth.js`
- `src/firebase.js`
- `src/index.js`
- `src/components/AppHeader.js`
- `src/components/ActAsBoundary.js`
- `src/components/ActAsControl.js`
- `src/components/__tests__/ActAsBoundary.test.jsx`
- `src/components/__tests__/ActAsControl.test.jsx`
- `src/services/actAs.js`
- `src/services/calendarService.js`
- `src/services/__tests__/actAs.test.js`
- `src/views/pages/login/ChangePassword.js`
- `src/views/pages/login/Login.js`
- `src/views/pages/login/StaffLogin.js`

Backend and rule files:

- `functions/actAs.js`
- `functions/actAs.test.js`
- `functions/index.js`
- `functions/staffTimesheets.js`
- `functions/staffTimesheets.test.js`
- `functions/registrationEnrollment.js`
- `firestore.rules`
- `storage.rules`
- `scripts/testActAsRules.cjs`

## Backend release — October 18, 2026

With explicit user approval, deployed the Firestore/Storage session rules and
the five named backend functions. Hosting was not deployed; the production
frontend remains `/assets/index-DD_2y0VM.js`. The feature is available through
the local preview at `http://localhost:3001/`.

The user separately approved granting `roles/iam.serviceAccountTokenCreator`
to `tarbiyah-sms@appspot.gserviceaccount.com` on that same service account only.
IAM Credentials was already enabled. The permission was applied at that narrow
resource scope and recorded in the release receipt.

Repeated the 26 backend tests and the isolated Firestore/Storage session-access
checks successfully. Live rule contents match the tested source. All five
targeted functions are ACTIVE. `actAs` returns a successful 204 CORS preflight
and rejects an unauthenticated POST with 401. Verified the signed-in administrator
can load the teacher directory from localhost and select Asma's `TLA00042` profile.
The administrator must select **Start acting as teacher** to begin the temporary
teacher session; that action and a signed-in teacher workflow have not yet been
exercised. No test attendance or teacher-record writes were performed.

The local staff login now uses `resolveProfileRole` so the actual admin record
with `primaryRole: SchoolAdmin` is accepted. Two component regression checks
cover this profile shape and continued rejection of unauthorized parent logins.
The separate proposed Hosting plan includes this fix and its regression tests;
the existing active Hosting plan was preserved.

Deployment receipts and previous live rules are saved in
`/Users/mohoaj/Documents/ChatGPT/SMS/outputs/act-as-backend-release-2026-10-18/`.

## Frontend release — October 18, 2026

Deployed through `node scripts/releaseHosting.cjs deploy` after verifying exactly
19 intended frontend changes against the live baseline. The prior active plan
and baseline were backed up before promoting the reviewed Act as plan. The
mandatory guard, 327 frontend tests, and production build passed. Both the
Firebase predeploy verification and custom-domain asset confirmation passed.

Verified production asset: `/assets/index-DbVWxOJ9.js`.
Receipt: `release/history/1792374634674.json`.
The guard advanced `hosting-baseline.json` only after confirming the live asset.

Production verification confirmed successful Google sign-in as the configured
owner, visibility of the Act as control, and loading of the teacher directory
through `/api/actAs`. Asma's profile is selected in the production browser.
Both `/api/actAs` and `/api/staffTimesheets` reject unauthenticated POSTs with
JSON HTTP 401 responses, confirming the API rewrites are active.

The owner-only frontend and backend checks remain in place. Regression tests
cover other administrators, aliases, lookalike addresses, unverified identities,
and spoofed request-body identities. A signed-in teacher session and attendance
write were not exercised during this release; no test attendance was created.

Frontend release evidence is saved in
`/Users/mohoaj/Documents/ChatGPT/SMS/outputs/act-as-frontend-release-2026-10-18/`.
