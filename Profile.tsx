import { useState, useRef, useEffect } from 'react'
import { updateProfile, reauthenticateWithCredential, updatePassword, EmailAuthProvider } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Camera, Lock, Shield, Eye, EyeOff } from 'lucide-react'
import { auth, storage } from './firebase'
import { useAuth } from './AuthContext'
import { updateUserProfile } from './firestore'
import { Spinner } from './Spinner'
import { Toast } from './Toast'

export function Profile() {
  const { currentUser, userDoc } = useAuth()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const isGoogle = currentUser?.providerData[0]?.providerId === 'google.com'

  const initials = (userDoc?.name || currentUser?.displayName || 'U').slice(0, 2).toUpperCase()

  useEffect(() => {
    setName(userDoc?.name || currentUser?.displayName || '')
    setCountry(userDoc?.country || '')
  }, [userDoc, currentUser])

  async function handleSave() {
    if (!currentUser) return
    setSaving(true)
    try {
      await updateProfile(currentUser, { displayName: name })
      await updateUserProfile(currentUser.uid, { name, country })
      setToast('Profile updated successfully')
    } catch {
      setToast('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    setAvatarLoading(true)
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateProfile(currentUser, { photoURL: url })
      await updateUserProfile(currentUser.uid, { photoURL: url })
      setToast('Avatar updated!')
    } catch {
      setToast('Failed to upload avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  async function handlePasswordChange() {
    if (!currentUser) return
    setPwError('')
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    setPwLoading(true)
    try {
      const cred = EmailAuthProvider.credential(currentUser.email!, currentPw)
      await reauthenticateWithCredential(currentUser, cred)
      await updatePassword(currentUser, newPw)
      setToast('Password updated successfully')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ''
      setPwError(code === 'auth/wrong-password' ? 'Current password is incorrect' : 'Failed to update password')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast('')} />}

      {/* Profile header */}
      <div className="card p-8 mb-6 flex items-center gap-6">
        <div className="relative">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} className="w-20 h-20 rounded-full object-cover" alt="avatar" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-accent/20 text-accent text-2xl font-medium flex items-center justify-center">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
            className="absolute bottom-0 right-0 bg-navy-raised border border-white/[0.13] rounded-full p-1.5 hover:bg-navy-raised/80 transition"
          >
            {avatarLoading ? <Spinner size={12} className="text-accent" /> : <Camera className="w-3 h-3 text-white/60" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1">
          <p className="text-xl font-medium text-white tracking-tight">{userDoc?.name || currentUser?.displayName || 'User'}</p>
          <p className="text-sm text-white/40 mt-0.5">{currentUser?.email}</p>
          <p className="text-xs text-white/30 mt-1">
            Member since {currentUser?.metadata.creationTime
              ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>

        <span className="bg-accent/10 text-accent text-xs px-3 py-1 rounded-full">
          {userDoc?.role === 'admin' ? 'Admin' : 'Investor'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Personal info */}
        <div className="card p-6">
          <p className="text-sm font-medium text-white mb-6">Personal Information</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-white/[0.13] rounded-lg px-4 py-2.5 text-sm bg-navy-raised text-white focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-white/[0.13] rounded-lg px-4 py-2.5 text-sm bg-navy-raised text-white focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block flex items-center gap-2">
                <Lock className="w-3 h-3" /> Email
              </label>
              <input
                value={currentUser?.email || ''}
                readOnly
                className="w-full border border-white/[0.07] rounded-lg px-4 py-2.5 text-sm bg-navy-raised text-white/50 cursor-not-allowed opacity-50"
              />
              <p className="text-xs text-white/30 mt-1">Email cannot be changed</p>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {saving && <Spinner size={14} />}
              Save changes
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="card p-6">
          <p className="text-sm font-medium text-white mb-6">Security</p>
          {isGoogle ? (
            <div className="bg-navy-raised rounded-xl p-4 flex gap-3">
              <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/50">You signed in with Google. Password management is handled by Google.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Current Password', value: currentPw, setter: setCurrentPw, type: 'password' },
                { label: 'New Password', value: newPw, setter: setNewPw, type: showNew ? 'text' : 'password', toggle: () => setShowNew(!showNew), showToggle: true },
                { label: 'Confirm New Password', value: confirmPw, setter: setConfirmPw, type: 'password' },
              ].map(({ label, value, setter, type, toggle, showToggle }) => (
                <div key={label}>
                  <label className="text-xs text-white/50 mb-1.5 block">{label}</label>
                  <div className="relative">
                    <input
                      type={type}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-white/[0.13] rounded-lg px-4 py-2.5 pr-10 text-sm bg-navy-raised text-white focus:outline-none focus:border-accent/50"
                    />
                    {showToggle && toggle && (
                      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pwError && <p className="text-loss text-xs">{pwError}</p>}
              <button onClick={handlePasswordChange} disabled={pwLoading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {pwLoading && <Spinner size={14} />}
                Update password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}





