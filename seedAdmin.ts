import * as admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const adminUid = process.argv[2]
if (!adminUid) {
  console.log('Usage: npx tsx seedAdmin.ts <firebase-uid>')
  console.log('Get the UID from Firebase Console → Authentication → Users')
  process.exit(1)
}

let serviceAccount: admin.ServiceAccount
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, 'service-account.json'), 'utf-8'))
} catch {
  console.error('❌ service-account.json not found. Place it in the project root.')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

await db.collection('users').doc(adminUid).set({
  name: 'Admin',
  email: 'admin@teslastockinvestment.com',
  photoURL: '',
  country: 'Global',
  role: 'admin',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
})

await db.collection('balances').doc(adminUid).set({
  available: 0,
  locked: 0,
  total: 0,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
})

console.log(`✅ Admin seeded for UID: ${adminUid}`)
process.exit(0)
