import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { getCachedProfile } from './lib/workoutCache'

import SplashScreen    from './pages/SplashScreen'
import AuthScreen      from './pages/AuthScreen'
import SixTrials       from './pages/SixTrials'
import TierReveal      from './pages/TierReveal'
import Dashboard       from './pages/Dashboard'
import WorkoutSession  from './pages/WorkoutSession'
import WorkoutSummary  from './pages/WorkoutSummary'
import NutritionTracker from './pages/NutritionTracker'
import MealScanner     from './pages/MealScanner'
import AdaptiveAI      from './pages/AdaptiveAI'
import Profile         from './pages/Profile'
import WorkoutHistory  from './pages/WorkoutHistory'
import HomeWorkouts    from './pages/HomeWorkouts'
import HomeWorkoutSession from './pages/HomeWorkoutSession'
import MealPlanner     from './pages/MealPlanner'
import PRBoard         from './pages/PRBoard'
import ProgressPhotos  from './pages/ProgressPhotos'
import VolumeCharts    from './pages/VolumeCharts'
import ShareCard       from './pages/ShareCard'
import Admin           from './pages/Admin'

// Protected route — redirects to auth if no session/profile
function Protected({ children }) {
  const { profile, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skanda-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!profile) return <Navigate to="/auth" replace />
  // New user without a tier → go through trials.
  // But check localStorage first — if the profile was saved locally but Supabase
  // was down, we shouldn't force the user to redo Six Trials.
  if (!profile.tier) {
    const cached = getCachedProfile()
    if (!cached?.tier) return <Navigate to="/trials" replace />
  }
  return children
}

// Post-trials but no dashboard access yet
function TrialsGuard({ children }) {
  const { loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skanda-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"           element={<SplashScreen />} />
      <Route path="/auth"       element={<AuthScreen />} />
      <Route path="/trials"     element={<TrialsGuard><SixTrials /></TrialsGuard>} />
      <Route path="/tier-reveal" element={<TrialsGuard><TierReveal /></TrialsGuard>} />

      <Route path="/dashboard"  element={<Protected><Dashboard /></Protected>} />
      <Route path="/workout"    element={<Protected><WorkoutSession /></Protected>} />
      <Route path="/summary"    element={<Protected><WorkoutSummary /></Protected>} />
      <Route path="/nutrition"  element={<Protected><NutritionTracker /></Protected>} />
      <Route path="/meal-scan"  element={<Protected><MealScanner /></Protected>} />
      <Route path="/ai"         element={<Protected><AdaptiveAI /></Protected>} />
      <Route path="/profile"    element={<Protected><Profile /></Protected>} />
      <Route path="/history"             element={<Protected><WorkoutHistory /></Protected>} />
      <Route path="/home-workouts"      element={<Protected><HomeWorkouts /></Protected>} />
      <Route path="/home-workout-session" element={<Protected><HomeWorkoutSession /></Protected>} />
      <Route path="/meal-plan"          element={<Protected><MealPlanner /></Protected>} />
      <Route path="/prs"                element={<Protected><PRBoard /></Protected>} />
      <Route path="/progress-photos"    element={<Protected><ProgressPhotos /></Protected>} />
      <Route path="/volume"             element={<Protected><VolumeCharts /></Protected>} />
      <Route path="/share-card"         element={<Protected><ShareCard /></Protected>} />
      <Route path="/admin"              element={<Protected><Admin /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
