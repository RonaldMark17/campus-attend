import { Users, BookOpen, Clock, Calendar, CheckCircle2, ShieldAlert, Award } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Authenticated Session
            </span>
            <span className="text-xs text-slate-500">Cookie Secured (HttpOnly)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Welcome back, {user.full_name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Signed in as <strong className="capitalize">{user.role.replace('_', ' ')}</strong> ({user.email})
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {user.role === 'instructor' && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-3 text-xs flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Today's Class Schedule</span>
                <span>CS101 • ComLab 101 • 09:00 AM</span>
              </div>
            </div>
          )}
          {user.role === 'admin' && (
            <div className="bg-purple-50 text-purple-900 border border-purple-200 rounded-xl px-4 py-3 text-xs flex items-center space-x-2">
              <Award className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold block">Administrator Access</span>
                <span>Full System Scope</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Enrolled Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">40</p>
          <span className="text-xs text-slate-500 mt-1 block">Active institutional directory</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Offerings</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">3</p>
          <span className="text-xs text-slate-500 mt-1 block">Term: AY 2026-2027 1S</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">96.0%</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">24 / 25 attended last session</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Corrections Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">0</p>
          <span className="text-xs text-slate-500 mt-1 block">All requests reviewed</span>
        </div>
      </div>

      {/* Role Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
            Active Class Offerings for Current Term
          </h2>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    CS101
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">Introduction to Computing</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Section: BSCS 1-A • Room: ComLab 101 • Instructor: Prof. Marcus Garcia</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                25 Students
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    CS102
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">Data Structures and Algorithms</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Section: BSCS 2-A • Room: ComLab 102 • Instructor: Prof. Marcus Garcia</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                15 Students
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    IT101
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">Web Systems and Technologies</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Section: BSIT 1-A • Room: Lecture Hall B • Instructor: Engr. Clara Santos</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                0 Students
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-emerald-600" />
              Role Authorization Profile
            </h2>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-900 block mb-0.5">Assigned Permissions:</span>
                <p>
                  {user.role === 'admin' && 'System Management, User Accounts, Student Directory, Full Reporting, Audit Logs.'}
                  {user.role === 'instructor' && 'Assigned Class Rosters, Manual Attendance Recording, Correction Requests.'}
                  {user.role === 'dept_head' && 'Department Scope, Attendance Compliance Tracking, Correction Approval.'}
                  {user.role === 'registrar' && 'Student Profile Management, Academic Term Setup, Official Enrollment Reports.'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-900 block mb-0.5">Offline Network Policy:</span>
                <p>Air-gapped operation active. Data stays strictly on institutional LAN.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-mono">
              Session ID Active • Auto-expires in 8 hours
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
