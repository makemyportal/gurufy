import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../utils/firebase'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import {
  Search, MapPin, BookOpen, Award, Clock, Filter, Mail, Eye,
  Star, GraduationCap, Loader2, MessageSquare, Users
} from 'lucide-react'

export default function TeacherSearch() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')

  useEffect(() => {
    async function fetchTeachers() {
      try {
        // Get all users with role 'teacher'
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)))
        const teacherUsers = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.role === 'teacher' && u.uid !== currentUser?.uid)

        // Get teacher profile details
        const teachersSnap = await getDocs(collection(db, 'teachers'))
        const teacherProfiles = {}
        teachersSnap.docs.forEach(d => {
          teacherProfiles[d.id] = d.data()
        })

        // Merge user + teacher data
        const merged = teacherUsers.map(u => ({
          ...u,
          ...teacherProfiles[u.uid],
        }))

        setTeachers(merged)
      } catch (err) {
        console.error('Fetch teachers error:', err)
      }
      setLoading(false)
    }
    fetchTeachers()
  }, [currentUser])

  const subjects = ['All', ...new Set(teachers.map(t => t.subject).filter(Boolean))]

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSubject = selectedSubject === 'All' || t.subject === selectedSubject
    return matchesSearch && matchesSubject
  })

  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'T'

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="section-title">Find Teachers</h1>
        <p className="text-surface-500 text-sm mt-1">Discover talented educators for your school</p>
      </div>

      {/* Filters */}
      <div className="glass-card-solid p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-12"
            />
          </div>
          {subjects.length > 1 && (
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field w-full sm:w-44">
              {subjects.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-surface-500 mb-4 font-semibold">{filteredTeachers.length} teachers found</p>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      )}

      {!loading && filteredTeachers.length === 0 && (
        <div className="glass-card-solid p-12 text-center">
          <Search className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-700">No teachers found</h3>
          <p className="text-sm text-surface-500 mt-1">
            {teachers.length === 0 ? 'No teachers have registered yet.' : 'Try adjusting your search filters.'}
          </p>
        </div>
      )}

      {/* Teacher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredTeachers.map((teacher, idx) => (
          <div key={teacher.uid} className="glass-card-solid p-5 card-hover animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden shadow-sm">
                {teacher.profilePhoto
                  ? <img src={teacher.profilePhoto} alt="" className="w-full h-full object-cover" />
                  : initials(teacher.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-surface-900">{teacher.name || 'Teacher'}</h3>
                    {teacher.subject && (
                      <p className="text-sm text-primary-600 font-medium flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> {teacher.subject} Teacher
                      </p>
                    )}
                  </div>
                  <span className={`badge text-[10px] ${
                    teacher.availability === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-600'
                  }`}>
                    {teacher.availability === 'available' ? 'Available' : 'Busy'}
                  </span>
                </div>

                {teacher.bio && (
                  <p className="text-xs text-surface-600 mt-2 line-clamp-2">{teacher.bio}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-surface-500">
                  {teacher.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {teacher.location}</span>
                  )}
                  {teacher.experience && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {teacher.experience}</span>
                  )}
                  {teacher.qualification && (
                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {teacher.qualification}</span>
                  )}
                </div>

                {teacher.certifications && teacher.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {teacher.certifications.map(cert => (
                      <span key={cert} className="badge bg-primary-50 text-primary-600 text-[10px]">{cert}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end mt-4 pt-3 border-t border-surface-100 gap-2">
                  <button onClick={() => navigate(`/user/${teacher.uid}`)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Profile
                  </button>
                  <button onClick={() => navigate('/messaging')} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
