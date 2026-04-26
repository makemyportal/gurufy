import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import CoinGate from './components/CoinGate'
import Home from './pages/Home'
import Login from './pages/Login'

// Lazy loaded components (Dashboard & App Features)
const Certificates = lazy(() => import('./pages/Certificates'))
const Todo = lazy(() => import('./pages/Todo'))
const Gradebook = lazy(() => import('./pages/Gradebook'))
const Locker = lazy(() => import('./pages/Locker'))
const TeacherProfile = lazy(() => import('./pages/TeacherProfile'))
const SchoolProfile = lazy(() => import('./pages/SchoolProfile'))
const Jobs = lazy(() => import('./pages/Jobs'))
const Resources = lazy(() => import('./pages/Resources'))
const AITools = lazy(() => import('./pages/AITools'))
const AIDirectory = lazy(() => import('./pages/AIDirectory'))
const GenerationHistory = lazy(() => import('./pages/GenerationHistory'))
const Groups = lazy(() => import('./pages/Groups'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const SchoolDashboard = lazy(() => import('./pages/SchoolDashboard'))
const TeacherSearch = lazy(() => import('./pages/TeacherSearch'))
const Settings = lazy(() => import('./pages/Settings'))
const Messaging = lazy(() => import('./pages/Messaging'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const LessonPlanner = lazy(() => import('./pages/LessonPlanner'))
const Timetable = lazy(() => import('./pages/Timetable'))
const ExamPaperGen = lazy(() => import('./pages/ExamPaperGen'))
const SmartExamMaker = lazy(() => import('./pages/SmartExamMaker'))
const ClassroomQuiz = lazy(() => import('./pages/ClassroomQuiz'))

// Lazy loaded components (Public info pages)
const About = lazy(() => import('./pages/public/About'))
const HowItWorks = lazy(() => import('./pages/public/HowItWorks'))
const Pricing = lazy(() => import('./pages/public/Pricing'))
const Contact = lazy(() => import('./pages/public/Contact'))
const Blog = lazy(() => import('./pages/public/Blog'))
const Privacy = lazy(() => import('./pages/public/Privacy'))
const Terms = lazy(() => import('./pages/public/Terms'))

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
        <Route path="certificates" element={<CoinGate toolName="Certificate Generator"><Certificates /></CoinGate>} />
        <Route path="todo" element={<CoinGate toolName="Tasks & Reminders"><Todo /></CoinGate>} />
        <Route path="gradebook" element={<CoinGate toolName="Smart Gradebook"><Gradebook /></CoinGate>} />
        <Route path="locker" element={<CoinGate toolName="Private Locker"><Locker /></CoinGate>} />
        <Route path="profile" element={<ProtectedRoute><ProfileRouter /></ProtectedRoute>} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="resources" element={<Resources />} />
        <Route path="ai-tools" element={<AITools />} />
        <Route path="ai-directory" element={<AIDirectory />} />
        <Route path="history" element={<ProtectedRoute><GenerationHistory /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="lesson-planner" element={<CoinGate toolName="Lesson Planner" toolId="lesson-planner"><LessonPlanner /></CoinGate>} />
        <Route path="timetable" element={<CoinGate toolName="Timetable Builder" toolId="timetable"><Timetable /></CoinGate>} />
        <Route path="exam-generator" element={<CoinGate toolName="Exam Paper Generator" toolId="exam-generator"><ExamPaperGen /></CoinGate>} />
        <Route path="smart-exam" element={<CoinGate toolName="Smart Exam Maker" toolId="smart-exam"><SmartExamMaker /></CoinGate>} />
        <Route path="classroom-quiz" element={<CoinGate toolName="Classroom Quiz" toolId="classroom-quiz"><ClassroomQuiz /></CoinGate>} />

        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
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
