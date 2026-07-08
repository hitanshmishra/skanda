import { useState, useEffect, createContext, useContext, createElement } from 'react'
import { supabase, onAuthChange, getSession, getProfile } from '../lib/supabase'
import { getCachedProfile, cacheProfile, clearProfile } from '../lib/workoutCache'
import { runCloudHydration } from '../lib/cloudSync'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // ── Initialise profile synchronously from cache so Protected routes
  //    never see a null profile on first render (prevents refresh→login flash)
  const [profile, setProfileState] = useState(() => getCachedProfile())
  const [session, setSession]      = useState(null)
  const [loading, setLoading]      = useState(true)

  useEffect(() => {
    async function init() {
      const sess = await getSession()
      setSession(sess)

      if (sess?.user?.id) {
        // Logged-in user: try to refresh from Supabase
        const p = await getProfile(sess.user.id)
        if (p) {
          setProfileState(p)
          cacheProfile(p)
        }
        // Hydrate cloud backup data into localStorage (once per day, non-blocking)
        runCloudHydration(sess.user.id)
      }
      // If no Supabase session the synchronous cache value is already in state
      setLoading(false)
    }
    init()

    const unsub = onAuthChange(async (sess) => {
      setSession(sess)
      if (sess?.user?.id) {
        const p = await getProfile(sess.user.id)
        if (p) {
          setProfileState(p)
          cacheProfile(p)
        }
        runCloudHydration(sess.user.id)
        // If Supabase returned nothing, keep whatever is already in state
        // (either the cache-initialised value or what AuthScreen.setProfile set).
        // Do NOT fall back to null — that would kick the user to /trials.
      } else {
        setProfileState(null)
      }
    })
    return unsub
  }, [])

  function setProfile(p) {
    setProfileState(p)
    cacheProfile(p)
  }

  function logout() {
    setSession(null)
    setProfileState(null)
    clearProfile()
    supabase?.auth.signOut()
  }

  return createElement(
    AuthContext.Provider,
    { value: { session, profile, loading, setProfile, logout } },
    children
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
