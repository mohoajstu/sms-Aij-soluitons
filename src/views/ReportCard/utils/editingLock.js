import { doc, getDocFromServer } from 'firebase/firestore'

/**
 * Reads the admin "Disable Report Card Editing" switch straight from the
 * server, so a save from a page opened before the switch was flipped is still
 * refused. If the server cannot be reached the save itself will fail anyway,
 * so this does not block on a read error.
 */
export const isEditingDisabledNow = async (firestore) => {
  try {
    const snap = await getDocFromServer(doc(firestore, 'systemSettings', 'reportCardSms'))
    return Boolean(snap.exists() && snap.data().disableEditing)
  } catch (error) {
    console.warn('Could not confirm report card editing setting:', error)
    return false
  }
}
