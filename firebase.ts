import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyByJ9G3R5R8V_CYTNXNNuV6ZWQo1cPDt_A',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tesla-3863b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tesla-3863b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tesla-3863b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '684384171989',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:684384171989:web:f51602b476f675d6f1af5c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-YTKGPSYB70',
}

const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

export default app
export { analytics }





