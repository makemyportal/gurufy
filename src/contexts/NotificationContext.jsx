import { createContext, useContext, useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export function useNotifications() {
  return useContext(NotificationContext)
}

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
      setLoading(false)
    }, (err) => {
      console.error('Notifications listener error:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser])

  async function markAsRead(notificationId) {
    if (!currentUser) return
    try {
      await updateDoc(
        doc(db, 'users', currentUser.uid, 'notifications', notificationId),
        { read: true }
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  async function markAllAsRead() {
    if (!currentUser || notifications.length === 0) return
    try {
      const batch = writeBatch(db)
      notifications.filter(n => !n.read).forEach(n => {
        const ref = doc(db, 'users', currentUser.uid, 'notifications', n.id)
        batch.update(ref, { read: true })
      })
      await batch.commit()
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
