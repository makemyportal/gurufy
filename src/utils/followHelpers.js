import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore'
import { db } from './firebase'
import { createNotification } from './notificationHelpers'

/**
 * Follow a user.
 * Creates a follow doc and updates follower/following counts.
 */
export async function followUser(currentUserId, currentUserName, targetUserId) {
  if (currentUserId === targetUserId) return

  const followDocRef = doc(db, 'follows', `${currentUserId}_${targetUserId}`)
  const existing = await getDoc(followDocRef)
  if (existing.exists()) return // Already following

  await setDoc(followDocRef, {
    followerId: currentUserId,
    followingId: targetUserId,
    createdAt: new Date().toISOString(),
  })

  // Update follower count on target user
  const targetStatsRef = doc(db, 'userStats', targetUserId)
  const targetSnap = await getDoc(targetStatsRef)
  if (targetSnap.exists()) {
    await updateDoc(targetStatsRef, { followers: increment(1) })
  } else {
    await setDoc(targetStatsRef, { followers: 1, following: 0 })
  }

  // Update following count on current user
  const currentStatsRef = doc(db, 'userStats', currentUserId)
  const currentSnap = await getDoc(currentStatsRef)
  if (currentSnap.exists()) {
    await updateDoc(currentStatsRef, { following: increment(1) })
  } else {
    await setDoc(currentStatsRef, { followers: 0, following: 1 })
  }

  // Send notification
  createNotification(targetUserId, {
    type: 'connection',
    title: `${currentUserName} started following you`,
    fromUserId: currentUserId,
    fromUserName: currentUserName,
  })
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) return

  const followDocRef = doc(db, 'follows', `${currentUserId}_${targetUserId}`)
  const existing = await getDoc(followDocRef)
  if (!existing.exists()) return // Not following

  await deleteDoc(followDocRef)

  // Update counts
  const targetStatsRef = doc(db, 'userStats', targetUserId)
  const targetSnap = await getDoc(targetStatsRef)
  if (targetSnap.exists()) {
    await updateDoc(targetStatsRef, { followers: increment(-1) })
  }

  const currentStatsRef = doc(db, 'userStats', currentUserId)
  const currentSnap = await getDoc(currentStatsRef)
  if (currentSnap.exists()) {
    await updateDoc(currentStatsRef, { following: increment(-1) })
  }
}

/**
 * Check if user A is following user B.
 */
export async function isFollowing(currentUserId, targetUserId) {
  const followDocRef = doc(db, 'follows', `${currentUserId}_${targetUserId}`)
  const snap = await getDoc(followDocRef)
  return snap.exists()
}

/**
 * Get follow stats for a user.
 */
export async function getFollowStats(userId) {
  const ref = doc(db, 'userStats', userId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return snap.data()
  }
  return { followers: 0, following: 0 }
}
