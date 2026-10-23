import { collection, getDocs, query, where } from 'firebase/firestore'

// Include collaborative reports without changing their original ownership.
export const getTeacherDrafts = async (db, uid) => {
  const [owned, shared] = await Promise.all([
    getDocs(query(collection(db, 'reportCardDrafts'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'reportCardDrafts'), where('contributorIds', 'array-contains', uid))),
  ])
  const docs = [...new Map([...owned.docs, ...shared.docs].map((snapshot) => [snapshot.id, snapshot])).values()]
  return { docs, forEach: (callback) => docs.forEach(callback) }
}
