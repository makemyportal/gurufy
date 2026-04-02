import { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../utils/firebase'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, name, role) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })

    const userData = {
      name,
      email,
      role,
      profilePhoto: '',
      location: '',
      xp: 1000,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), userData)

    if (role === 'teacher') {
      await setDoc(doc(db, 'teachers', cred.user.uid), {
        subject: '',
        qualification: '',
        experience: '',
        bio: '',
        resume: '',
        certifications: [],
        availability: 'available',
        aiCredits: {
          remaining: 5,
          lastRefillDate: new Date().toISOString().split('T')[0]
        }
      })
    } else if (role === 'school') {
      await setDoc(doc(db, 'schools', cred.user.uid), {
        schoolName: '',
        contactPerson: name,
        address: '',
        phone: '',
        website: '',
      })
    }

    return cred
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle(role = 'teacher') {
    const cred = await signInWithPopup(auth, googleProvider)
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid))

    if (!userDoc.exists()) {
      const userData = {
        name: cred.user.displayName || '',
        email: cred.user.email,
        role,
        profilePhoto: cred.user.photoURL || '',
        location: '',
        xp: 1000,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', cred.user.uid), userData)

      if (role === 'teacher') {
        await setDoc(doc(db, 'teachers', cred.user.uid), {
          subject: '',
          qualification: '',
          experience: '',
          bio: '',
          resume: '',
          certifications: [],
          availability: 'available',
          aiCredits: {
            remaining: 5,
            lastRefillDate: new Date().toISOString().split('T')[0]
          }
        })
      } else if (role === 'school') {
        await setDoc(doc(db, 'schools', cred.user.uid), {
          schoolName: '',
          contactPerson: cred.user.displayName || '',
          address: '',
          phone: '',
          website: '',
        })
      }
    }

    return cred
  }

  function logout() {
    return signOut(auth)
  }

  async function fetchUserProfile(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      setUserProfile({ uid, ...data })

      if (data.role === 'teacher') {
        const teacherDoc = await getDoc(doc(db, 'teachers', uid))
        if (teacherDoc.exists()) {
          setUserProfile(prev => ({ ...prev, ...teacherDoc.data() }))
        }
      } else if (data.role === 'school') {
        const schoolDoc = await getDoc(doc(db, 'schools', uid))
        if (schoolDoc.exists()) {
          setUserProfile(prev => ({ ...prev, ...schoolDoc.data() }))
        }
      }
    }
  }

  async function updateXP(amount) {
    if (!currentUser || !userProfile) return false;
    const newXP = (userProfile.xp || 0) + amount;
    if (newXP < 0) return false; // Not enough XP
    
    await updateDoc(doc(db, 'users', currentUser.uid), { xp: newXP });
    setUserProfile(prev => ({ ...prev, xp: newXP }));
    return true;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await fetchUserProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    fetchUserProfile,
    updateXP,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
