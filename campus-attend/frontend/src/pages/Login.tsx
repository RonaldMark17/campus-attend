import React, { useState } from 'react'
import { Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, AlertCircle, WifiOff, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Please enter both username and password.')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    try {
      await login(usernameOrEmail.trim(), password)
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials or connection error.')
    } finally {
      setLoading(false)
    }
  };

  const handleFillDemo = (user: string, pass: string) => {
    setUsernameOrEmail(user)
    setPassword(pass)
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative LAN Badge */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center space-x-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
          <WifiOff className="w-3.5 h-3.5 mr-1.5" />
          Offline LAN Only
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl shadow-lg mb-3">
          CA
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">CampusAttend</h1>
        <p className="mt-1 text-sm text-slate-400">
          College Attendance Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 bg-rose-950/70 border border-rose-800 text-rose-200 text-sm rounded-lg p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                Username or School Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. admin or prof.garcia@school.lan"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Quick Role Test Logins:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo('admin', 'admin123')}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-750 border border-slate-700 hover:border-purple-600 text-purple-300 rounded-md text-left transition-colors font-medium flex flex-col"
              >
                <span className="font-bold">Admin</span>
                <span className="text-[10px] text-slate-400 font-mono">admin / admin123</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('instructor1', 'password123')}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-750 border border-slate-700 hover:border-emerald-600 text-emerald-300 rounded-md text-left transition-colors font-medium flex flex-col"
              >
                <span className="font-bold">Instructor</span>
                <span className="text-[10px] text-slate-400 font-mono">instructor1 / password123</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('depthead', 'password123')}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-750 border border-slate-700 hover:border-blue-600 text-blue-300 rounded-md text-left transition-colors font-medium flex flex-col"
              >
                <span className="font-bold">Dept Head</span>
                <span className="text-[10px] text-slate-400 font-mono">depthead / password123</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('registrar', 'password123')}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-750 border border-slate-700 hover:border-amber-600 text-amber-300 rounded-md text-left transition-colors font-medium flex flex-col"
              >
                <span className="font-bold">Registrar</span>
                <span className="text-[10px] text-slate-400 font-mono">registrar / password123</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 mr-1" />
          <span>Sessions secured via Argon2id & HttpOnly Cookies. Complies with RA 10173.</span>
        </div>
      </div>
    </div>
  )
}
