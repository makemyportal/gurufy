import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import Certificates from './pages/Certificates'
import Todo from './pages/Todo'
import Gradebook from './pages/Gradebook'
import Locker from './pages/Locker'
import Login from './pages/Login'
import Feed from './pages/Feed'
import TeacherProfile from './pages/TeacherProfile'
import SchoolProfile from './pages/SchoolProfile'
import Jobs from './pages/Jobs'
import Resources from './pages/Resources'
import AITools from './pages/AITools'
import GenerationHistory from './pages/GenerationHistory'
import Groups from './pages/Groups'
import TeacherDashboard from './pages/TeacherDashboard'
import SchoolDashboard from './pages/SchoolDashboard'
import TeacherSearch from './pages/TeacherSearch'
import Settings from './pages/Settings'
import Messaging from './pages/Messaging'
import Events from './pages/Events'
import AdminDashboard from './pages/AdminDashboard'
import Leaderboard from './pages/Leaderboard'
import UserProfile from './pages/UserProfile'
import Marketplace from './pages/Marketplace'
import Mentorship from './pages/Mentorship'
import AudioRooms from './pages/AudioRooms'
// Public info pages
import About from './pages/public/About'
import HowItWorks from './pages/public/HowItWorks'
import Pricing from './pages/public/Pricing'
import Contact from './pages/public/Contact'
import Blog from './pages/public/Blog'
import Privacy from './pages/public/Privacy'
import Terms from './pages/public/Terms'

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
          <p className="text-surface-500 font-medium">Loading LDMS...</p>
        </div>
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/login" />
  return children
}

function DashboardRouter() {
  const { userProfile, loading } = useAuth()
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
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Main App — exactly like before */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="todo" element={<Todo />} />
        <Route path="gradebook" element={<Gradebook />} />
        <Route path="locker" element={<Locker />} />
        <Route path="profile" element={<ProtectedRoute><ProfileRouter /></ProtectedRoute>} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="resources" element={<Resources />} />
        <Route path="ai-tools" element={<AITools />} />
        <Route path="history" element={<ProtectedRoute><GenerationHistory /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="events" element={<Events />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        {/* Redirect /feed → / */}
        <Route path="feed" element={<Navigate to="/" replace />} />
      </Route>

      {/* Public info pages with their own marketing layout */}
      <Route path="/" element={<PublicLayout />}>
        <Route path="about" element={<About />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="contact" element={<Contact />} />
        <Route path="blog" element={<Blog />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
