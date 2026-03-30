import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Create a notification for a user.
 * @param {string} toUserId - The user ID to notify
 * @param {object} data - { type, title, fromUserId, fromUserName, relatedId }
 *   type: 'like' | 'comment' | 'message' | 'job' | 'connection' | 'system'
 */
export async function createNotification(toUserId, { type, title, fromUserId, fromUserName, relatedId }) {
  // Don't notify yourself
  if (toUserId === fromUserId) return

  try {
    await addDoc(collection(db, 'users', toUserId, 'notifications'), {
      type,
      title,
      fromUserId: fromUserId || '',
      fromUserName: fromUserName || '',
      relatedId: relatedId || '',
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}
