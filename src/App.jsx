import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Feed from './pages/Feed'
import TeacherProfile from './pages/TeacherProfile'
import SchoolProfile from './pages/SchoolProfile'
import Jobs from './pages/Jobs'
import Resources from './pages/Resources'
import AITools from './pages/AITools'
import Groups from './pages/Groups'
import TeacherDashboard from './pages/TeacherDashboard'
import SchoolDashboard from './pages/SchoolDashboard'
import TeacherSearch from './pages/TeacherSearch'
import Settings from './pages/Settings'
import Messaging from './pages/Messaging'
import Events from './pages/Events'
import AdminDashboard from './pages/AdminDashboard'
import Leaderboard from './pages/Leaderboard'

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-surface-500 font-medium">Loading Gurufy...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" />
  }

  return children
}

function DashboardRouter() {
  const { userProfile, loading } = useAuth()
  // Wait until profile is fully loaded before deciding which dashboard to show
  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center animate-pulse-soft" />
      </div>
    )
  }
  return userProfile.role === 'school' ? <SchoolDashboard /> : <TeacherDashboard />
}

function ProfileRouter() {
  const { userProfile } = useAuth()
  return userProfile?.role === 'school' ? <SchoolProfile /> : <TeacherProfile />
}

function AdminRoute({ children }) {
  const { userProfile, loading } = useAuth()

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center animate-pulse-soft" />
      </div>
    )
  }

  if (userProfile.role !== 'admin' && userProfile.role !== 'superadmin') {
    return <Navigate to="/" />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Feed />} />
        <Route path="profile" element={<ProfileRouter />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="resources" element={<Resources />} />
        <Route path="ai-tools" element={<AITools />} />
        <Route path="groups" element={<Groups />} />
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="teacher-search" element={<TeacherSearch />} />
        <Route path="settings" element={<Settings />} />
        <Route path="messaging" element={<Messaging />} />
        <Route path="events" element={<Events />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
