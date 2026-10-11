import { LogOut, WifiOff, ShieldCheck, User as UserIcon, LayoutDashboard, Users, BookOpen, UserCheck, FileCheck2, BarChart3 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'

export type NavTab = 'dashboard' | 'students' | 'academics' | 'attendance' | 'corrections' | 'reports'

interface NavbarProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { user, logout } = useAuth()

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', bg: 'bg-purple-900/60 text-purple-300 border-purple-700' }
      case 'instructor':
        return { label: 'Instructor', bg: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' }
      case 'dept_head':
        return { label: 'Department Head', bg: 'bg-blue-900/60 text-blue-300 border-blue-700' }
      case 'registrar':
        return { label: 'Registrar', bg: 'bg-amber-900/60 text-amber-300 border-amber-700' }
      default:
        return { label: role, bg: 'bg-slate-800 text-slate-300 border-slate-700' }
    }
  }

  const roleInfo = user ? getRoleBadge(user.role) : null

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-sm sticky top-0 z-50">
      <div className="px-6 py-3 flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-lg tracking-wider text-white shadow-sm">
              CA
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center">
                CampusAttend
                <span className="ml-2 text-[11px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
                  AY 2026-2027 1S
                </span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          {user && (
            <nav className="flex items-center space-x-1 pl-4 border-l border-slate-800">
              <button
                type="button"
                onClick={() => onTabChange('dashboard')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => onTabChange('attendance')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'attendance'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Take Attendance
              </button>

              <button
                type="button"
                onClick={() => onTabChange('corrections')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'corrections'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                Corrections
              </button>

              <button
                type="button"
                onClick={() => onTabChange('students')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'students'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Students
              </button>

              <button
                type="button"
                onClick={() => onTabChange('academics')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'academics'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Academics
              </button>

              <button
                type="button"
                onClick={() => onTabChange('reports')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                Reports
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-3 mt-2 sm:mt-0">
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline LAN
          </span>
          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
            RA 10173
          </span>

          {user && (
            <div className="flex items-center pl-3 border-l border-slate-700 space-x-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-200 flex items-center justify-end">
                  <UserIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {user.full_name}
                </div>
                {roleInfo && (
                  <span className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${roleInfo.bg} mt-0.5`}>
                    {roleInfo.label}
                  </span>
                )}
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
