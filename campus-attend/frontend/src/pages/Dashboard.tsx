import { useState, useEffect } from 'react'
import {
  Users,
  BookOpen,
  Clock,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  FileCheck2,
  BarChart3,
  Server,
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!user) return null

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0d1322] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Active Session</span>
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • UTC+8
            </span>
          </div>

          <h1 className="text-xl font-semibold text-white tracking-tight">
            Welcome back, {user.full_name}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Logged in as <span className="text-slate-200 capitalize font-medium">{user.role.replace('_', ' ')}</span> ({user.email}). All transactions are cryptographically signed on the local server.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-[#070a12] border border-white/[0.08] rounded-lg p-3 text-xs space-y-0.5">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center">
              <Server className="w-3 h-3 mr-1.5 text-slate-400" />
              Local Server Environment
            </div>
            <div className="font-medium text-white">Campus LAN Host</div>
            <div className="text-[11px] text-slate-400">WAL Mode • SQLite 3.45</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">79</div>
          <div className="flex items-center text-xs text-slate-400 font-medium mt-1">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            <span>Active in 3 Degree Programs</span>
          </div>
        </div>

        <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Offerings</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">3</div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            AY 2026-2027 • 1st Semester
          </div>
        </div>

        <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Attendance Rate</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">96.0%</div>
          <div className="flex items-center text-xs text-emerald-400 font-medium mt-1">
            <span>24 / 25 attended last roll call</span>
          </div>
        </div>

        <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending Corrections</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">0</div>
          <div className="text-xs text-slate-400 font-medium mt-1">
            All requests reviewed
          </div>
        </div>
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Active Class Offerings */}
        <div className="lg:col-span-2 bg-[#0d1322] rounded-xl border border-white/[0.08] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              Assigned Class Offerings for Current Term
            </h2>
            <span className="text-xs text-slate-400 font-medium">AY 2026-2027</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-xs">
                    CS101 - Introduction to Computing
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-200 border border-slate-700/60">
                    BSCS 1-A
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>Instructor: Prof. Marcus Garcia</span>
                  <span>•</span>
                  <span>Mon / Wed • 09:00 AM - 10:30 AM</span>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 self-start sm:self-auto">
                ComLab 101
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-xs">
                    CS102 - Data Structures & Algorithms
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-200 border border-slate-700/60">
                    BSCS 2-A
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>Instructor: Engr. Clara Santos</span>
                  <span>•</span>
                  <span>Tue / Thu • 01:00 PM - 02:30 PM</span>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 self-start sm:self-auto">
                Room 304
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-xs">
                    IT201 - Database Management Systems
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-200 border border-slate-700/60">
                    BSIT 2-A
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>Instructor: Prof. Marcus Garcia</span>
                  <span>•</span>
                  <span>Friday • 08:00 AM - 11:00 AM</span>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 self-start sm:self-auto">
                ComLab 102
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Security */}
        <div className="space-y-5">
          <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-white">
              Quick Actions
            </h2>

            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Take Roll Call</div>
                    <div className="text-[11px] text-slate-400">Mark today's classroom roster</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="p-3 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Correction Requests</div>
                    <div className="text-[11px] text-slate-400">Review pending excused slips</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="p-3 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Export PDF Reports</div>
                    <div className="text-[11px] text-slate-400">Download official semester rolls</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>

          {/* System Security & Integrity Panel */}
          <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-5 shadow-xs text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="font-semibold text-slate-300 text-xs flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Security & Data Integrity
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">Verified</span>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Network Boundary:</span>
                <span className="text-slate-200 font-medium">Authorized LAN Subnet Only</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Session Storage:</span>
                <span className="text-slate-200 font-medium">HttpOnly Strict Cookies</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Trail:</span>
                <span className="text-slate-200 font-medium">Immutable Append-Only Log</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Data Privacy:</span>
                <span className="text-emerald-400 font-medium">Zero Cloud Exfiltration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
