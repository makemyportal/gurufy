import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

console.log('Firebase Config API Key:', firebaseConfig.apiKey ? 'Exists' : 'Missing')

let app;
try {
  app = initializeApp(firebaseConfig)
  console.log('Firebase app initialized successfully:', !!app)
} catch (e) {
  console.error('Firebase initializeApp failed:', e)
}

// Analytics can fail in dev/localhost — lazy-init to prevent crashing the module
export let analytics = null
if (typeof window !== 'undefined') {
  import('firebase/analytics').then(({ getAnalytics }) => {
    try {
      analytics = getAnalytics(app)
    } catch (e) {
      console.warn('Firebase Analytics init failed:', e.message)
    }
  }).catch(() => {})
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

export default app
