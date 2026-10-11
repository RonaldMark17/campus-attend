import {
  LogOut,
  LayoutDashboard,
  Users,
  BookOpen,
  UserCheck,
  FileCheck2,
  BarChart3,
  Wifi
} from 'lucide-react'
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
        return { label: 'Admin', bg: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
      case 'instructor':
        return { label: 'Instructor', bg: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
      case 'dept_head':
        return { label: 'Dept Head', bg: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
      case 'registrar':
        return { label: 'Registrar', bg: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
      default:
        return { label: role, bg: 'text-slate-400 bg-slate-800 border-slate-700' }
    }
  }

  const roleInfo = user ? getRoleBadge(user.role) : null

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: UserCheck },
    { id: 'corrections' as NavTab, label: 'Corrections', icon: FileCheck2 },
    { id: 'reports' as NavTab, label: 'Reports', icon: BarChart3 },
    { id: 'students' as NavTab, label: 'Students', icon: Users },
    { id: 'academics' as NavTab, label: 'Academics', icon: BookOpen },
  ]

  return (
    <header className="sticky top-0 z-50 bg-[#090d16]/95 backdrop-blur-md border-b border-white/[0.08]">
      {/* Primary single-line navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-6 shrink-0">
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={() => onTabChange('dashboard')}
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow-xs group-hover:bg-emerald-500 transition-colors">
              CA
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white tracking-tight">CampusAttend</span>
              <span className="hidden sm:inline-block text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                AY 2026–27
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {user && (
            <nav className="hidden lg:flex items-center space-x-1 pl-4 border-l border-white/[0.08]">
              {navItems.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onTabChange(id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs border border-slate-700/70'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* Right Status Indicators & User Profile */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Offline LAN Badge */}
          <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <Wifi className="w-3 h-3 text-slate-400" />
            <span>Offline LAN</span>
          </div>

          {/* User Profile */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-xs text-slate-200">
                  {user.full_name.charAt(0)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-medium text-slate-200 leading-none">
                    {user.full_name}
                  </div>
                  {roleInfo && (
                    <span className={`inline-block text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded border ${roleInfo.bg} mt-1`}>
                      {roleInfo.label}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar Navigation for screens below LG breakpoint */}
      {user && (
        <div className="lg:hidden flex items-center space-x-1 px-4 py-2 border-t border-white/[0.06] overflow-x-auto bg-[#090d16]">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700/70'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      )}
    </header>
  )
}
