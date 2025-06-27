const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Initialize Firebase Admin SDK.
 *
 * The script prefers GOOGLE_APPLICATION_CREDENTIALS or the application default credentials
 * that are already configured on the machine. As a fallback, if a serviceAccountKey.json file
 * is present in the current directory, it will use that file to initialise the Admin SDK.
 */
function initFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

  // Prefer the local service account key if it exists
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      console.log('🔥 Firebase Admin SDK initialised with serviceAccountKey.json');
      return admin.app();
    } catch (err) {
      console.warn('⚠️  Failed to load serviceAccountKey.json:', err.message);
    }
  }

  // Fallback to Application Default Credentials (ADC)
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('🔥 Firebase Admin SDK initialised with application default credentials');
  } catch (adcErr) {
    console.error('❌ Unable to initialise Firebase Admin SDK with default credentials.');
    console.error('   Provide GOOGLE_APPLICATION_CREDENTIALS env var or place serviceAccountKey.json in this folder.');
    process.exit(1);
  }

  return admin.app();
}

/**
 * Determine a pseudo-email for a given Tarbiyah ID. Firebase Authentication requires an email
 * when using the Email / Password provider. We generate a deterministic, unique email so that
 * users can still sign-in with their Tarbiyah ID while satisfying Firebase constraints.
 */
function tarbiyahIdToEmail(tarbiyahId) {
  return `${tarbiyahId}@gmail.com`;
}

async function main() {
  initFirebase();

  const db = admin.firestore();
  const auth = admin.auth();
  const FieldValue = admin.firestore.FieldValue;

  const collections = [
    { name: 'students', role: 'Student' },
    { name: 'parents', role: 'Parent' },
    { name: 'faculty', role: 'Faculty' },
    { name: 'admins', role: 'Admin' },
  ];

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const { name: collectionName, role } of collections) {
    console.log(`\n📥 Fetching documents from collection: ${collectionName}`);
    const snapshot = await db.collection(collectionName).get();
    console.log(`   • Found ${snapshot.size} documents`);

    let processed = 0;

    for (const doc of snapshot.docs) {
      const tarbiyahId = doc.id;
      const data = doc.data();

      // Attempt to extract personal info (schema is similar across collections)
      const personal = data.personalInfo || {};
      const firstName = personal.firstName || personal.firstname || '';
      const lastName = personal.lastName || personal.lastname || '';

      const userRecordData = {
        uid: tarbiyahId,
        displayName: `${firstName} ${lastName}`.trim() || tarbiyahId,
        email: tarbiyahIdToEmail(tarbiyahId),
        password: 'Password',
      };

      // Ensure the Auth user exists (or create/update it accordingly)
      try {
        const existingUser = await auth.getUser(tarbiyahId);

        // Update email or password if they differ from the desired state
        const updates = {};
        if (existingUser.email !== userRecordData.email) {
          updates.email = userRecordData.email;
        }

        /*
         * Always reset the password to the default so every run guarantees the same
         * credential set (users can change it later via password-reset flow).
         */
        updates.password = userRecordData.password;

        if (Object.keys(updates).length) {
          await auth.updateUser(tarbiyahId, updates);
          console.log(`   🔄 Updated auth user: ${tarbiyahId}`);
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          try {
            await auth.createUser(userRecordData);
            console.log(`   ✔️  Created auth user: ${tarbiyahId}`);
          } catch (createErr) {
            totalErrors++;
            console.error(`   ❌ Failed to create auth user ${tarbiyahId}:`, createErr.message);
            continue; // Skip creating Firestore user doc if auth creation failed
          }
        } else {
          totalErrors++;
          console.error(`   ❌ Error fetching auth user ${tarbiyahId}:`, err.message);
          continue;
        }
      }

      // Prepare the Firestore user document
      const userDoc = {
        tarbiyahId,
        role,
        linkedCollection: collectionName,
        active: data.active ?? true,
        personalInfo: {
          firstName,
          lastName,
        },
        // Placeholder for any future customisation your dashboards might need
        dashboard: {
          theme: 'default',
        },
        stats: {
          loginCount: 0,
          lastLoginAt: null,
        },
        createdAt: FieldValue.serverTimestamp(),
      };

      try {
        await db.collection('users').doc(tarbiyahId).set(userDoc, { merge: true });
        processed++;
        totalProcessed++;
      } catch (firestoreErr) {
        totalErrors++;
        console.error(`   ❌ Failed to write users/${tarbiyahId}:`, firestoreErr.message);
      }
    }

    console.log(`   ✔️  Added/updated ${processed} users for role ${role}`);
  }

  console.log('\n🎉 User import complete!');
  console.log(`   • Total users processed: ${totalProcessed}`);
  console.log(`   • Total errors: ${totalErrors}`);

  process.exit(0);
}

main(); 