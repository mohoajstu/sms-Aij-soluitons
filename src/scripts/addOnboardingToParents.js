
const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

// Initialize Firebase Admin SDK
function initFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://tla-custom-solutions.firebaseio.com',
    })
  }
}

async function addOnboardingToParents() {
  initFirebase()
  const db = admin.firestore()
  const parentsRef = db.collection('parents')

  try {
    const snapshot = await parentsRef.get()
    if (snapshot.empty) {
      console.log('No parent documents found.')
      return
    }

    const batch = db.batch()
    snapshot.forEach((doc) => {
      const parentRef = parentsRef.doc(doc.id)
      batch.update(parentRef, { onboarding: false })
    })

    await batch.commit()
    console.log(`Successfully updated ${snapshot.size} parent documents.`)
  } catch (error) {
    console.error('Error updating parent documents:', error)
  }
}

addOnboardingToParents()
