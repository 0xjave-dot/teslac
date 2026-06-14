import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCTZ7Drg7DvWxKe5n7VqzagAIqhs4SY38w',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tesl-f61ed.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tesl-f61ed',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tesl-f61ed.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '846003377526',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:846003377526:web:3ec730861acb69c5469657',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ER162HY8ZN',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

export default app





