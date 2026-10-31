# SMS demo environment

A complete copy of the SMS that runs on **synthetic data only**: fictional students, parents and staff, every
feature working, nothing connected to real school records.

## How it works

The demo is the same app, built with `--mode demo`, pointed at a **separate Firebase project**
(`tarbiyah-sms-demo`) or at the local emulators. It is *not* a `DEMO` collection inside the production database.

| | Separate demo project (chosen) | `DEMO` collection in production |
|---|---|---|
| Real data can leak into a demo | No: different database, Auth users and Storage | Yes, if any one of the many `collection(...)` call sites misses the prefix |
| Works with existing security rules | Yes, unchanged | Rules would need changing; `AGENTS.md` forbids rules deploys for frontend work |
| Demo users can touch production | No | They would be real users in the production Auth project |
| Code change | A handful of small, inert-in-production guards | Hundreds of call sites |

### Safety layers (all tested)

1. **The app refuses to start** in demo mode unless `VITE_FIREBASE_PROJECT_ID` contains `demo`
   (`src/utils/demoMode.js`). Vite also loads the production `.env` in every mode, so this stops a demo build that is
   missing its `.env.demo` from silently using production.
2. **The seed script refuses** any project whose ID lacks `demo`, and the two real projects by name
   (`demo/seed/guard.cjs`). It also refuses to write or reset if it finds any non-demo student, parent, faculty or
   admin record.
3. **SMS is never sent.** In demo mode SMS requests are answered locally and never reach the network
   (`src/config/functionsBase.js`); acceptance emails are skipped; the demo project's functions treat the project as
   non-sending (`functions/index.js`); attendance texts are seeded as disabled.
4. **No production Cloud Functions host.** Six places used to hard-code `tarbiyah-sms.cloudfunctions.net`; in demo mode
   they use the demo project's functions instead. Production behaviour is unchanged.
5. **Synthetic data only.** Emails are `@demo.example`, phones are `613-555-01xx`, addresses are made up, and a test
   asserts no generated name matches anyone in the committed `src/scripts/*Report*.csv` exports.

## Try it locally (no cloud project needed)

```bash
cp .env.demo.example .env.demo
# in .env.demo set: VITE_FIREBASE_PROJECT_ID=demo-tarbiyah-sms and VITE_USE_EMULATORS=true
# (the other VITE_FIREBASE_* values can be any placeholder text)
```

Start the emulators (needs Java), then seed and run the app in two more terminals:

```bash
npx firebase-tools emulators:start --config firebase.demo.json --project demo-tarbiyah-sms --only auth,firestore,storage
```

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
  node demo/seed/run.cjs --project demo-tarbiyah-sms --reset
```

```bash
npx vite --mode demo
```

Open the app and use the **Demo accounts** buttons on the sign-in page. Emulator data is wiped when the emulators stop;
re-run the seed command to refill it.

## Host it for others (separate Firebase project)

1. In the Firebase console create a project whose ID contains `demo`, e.g. `tarbiyah-sms-demo`. Enable
   **Authentication → Email/Password**, **Firestore** (region `northamerica-northeast1`), **Storage** and **Hosting**,
   and add a **web app**.
2. `cp .env.demo.example .env.demo` and fill in the web app config. Keep `VITE_USE_EMULATORS=false`.
3. Deploy rules (the same `firestore.rules` and `storage.rules` as production, to the *demo* project only):

   ```bash
   npx firebase-tools deploy --only firestore:rules,storage --config firebase.demo.json --project tarbiyah-sms-demo
   ```

4. Seed it (authenticate with `gcloud auth application-default login`; set `--bucket` if your bucket is not
   `<project>.firebasestorage.app`):

   ```bash
   node demo/seed/run.cjs --project tarbiyah-sms-demo --reset
   ```

5. Build and deploy the site. The build goes to `build-demo/` so it never touches the production `build/`:

   ```bash
   npx vite build --mode demo --outDir build-demo
   npx firebase-tools deploy --only hosting --config firebase.demo.json --project tarbiyah-sms-demo
   ```

6. *(Optional, not tested here.)* Features that call Cloud Functions need them deployed to the demo project: approving
   a registration (`registrationEnrollment`), timesheets (`staffTimesheets`), creating a parent with a temporary
   password (`setParentTempPassword`), public registration (`registerStudent`), AI report comments
   (`generateReportCard`, needs an OpenAI key). `functions/index.js` builds a Twilio client when it loads, so the demo
   project needs placeholder config first, and **deploy only the functions you need by name** (never
   `sendScheduledSms` / `triggerAttendanceSms`):

   ```bash
   npx firebase-tools functions:config:set twilio.accountsid="ACdemo00000000000000000000000000" twilio.authtoken="demo" twilio.phonenumber="+15005550006" app.env="demo" --project tarbiyah-sms-demo
   npx firebase-tools deploy --only functions:registrationEnrollment,functions:staffTimesheets,functions:setParentTempPassword,functions:registerStudent --config firebase.demo.json --project tarbiyah-sms-demo
   ```

### Resetting between demos

Re-run `node demo/seed/run.cjs --project <demo-project> --reset`. It deletes everything in the demo project
(including anything created during a demo) and regenerates the data relative to *today*, so attendance, announcements
and deadlines always look current. Today's attendance is left empty on purpose so you can take it live.

## Demo accounts

All share one password: `DemoSchool-2026` (override with `DEMO_PASSWORD` when seeding and `VITE_DEMO_PASSWORD` when
building). The list lives in `src/config/demoAccounts.json`.

| Role | Email | Shows |
|---|---|---|
| Administrator | `demo.admin@demo.example` | People, courses, report review, registrations, timekeeping, settings |
| Teacher (Grade 3) | `demo.teacher@demo.example` | Own classes, attendance, report drafts in each review state |
| Teacher (Grade 7) | `demo.teacher2@demo.example` | Grade 7–8 progress reports |
| Parent (Grade 3 child) | `demo.parent@demo.example` | Child attendance, announcements, published report card |
| Parent (Grade 7 child) | `demo.parent2@demo.example` | Same, for a Grade 7 child |

Seeded: 60 students (JK–Grade 8) in 33 families, 13 teachers and 2 admins, 10 homerooms plus Quran, Arabic,
French and PE courses with gradebooks, attendance since the start of the school year, 6 announcements, 8 pending
public registrations ready to review and enroll, 10 days of staff check-ins, a pending timesheet correction, and
report cards from drafts through to published (two with real PDFs).

## Known limits

- The site is **public to anyone with the link, and the sign-in password is embedded in it**. That is fine for
  synthetic data. Never reuse a real password, and never add real people to the demo project.
- **Act as teacher** is hard-wired to one production email address (`SUPER_ADMIN_EMAIL`), so it is not available in the
  demo.
- Google Calendar / Sheets, Google sign-in, SMS and email are not live in the demo.
- The branding is still Tarbiyah Learning Academy's (logo and page titles). Say if you want a neutral "Demo Academy" skin.
- A demo build changes files under `src/`. The production release guard hashes `src/`, so these changes only reach
  production if you list them in `release/hosting-plan.json` and release through `node scripts/releaseHosting.cjs deploy`.
  They do nothing unless `VITE_DEMO_MODE=true`.

## Tests

```bash
node --test demo/seed/generate.test.cjs
npx vitest run src/utils/__tests__/demoMode.test.js src/config/__tests__/functionsBase.test.js
```
