import React, { useState } from 'react'
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Wifi,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
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
  }

  const handleFillDemo = (user: string, pass: string) => {
    setUsernameOrEmail(user)
    setPassword(pass)
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Top LAN Status Indicator */}
      <div className="absolute top-5 left-6 flex items-center space-x-2">
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <Wifi className="w-3.5 h-3.5 text-slate-400" />
          <span>School LAN Network</span>
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-600 text-white font-bold text-base shadow-xs mb-3">
          CA
        </div>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Sign in to CampusAttend
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Institutional offline attendance management
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Main Clean Card */}
        <div className="bg-[#0d1322] border border-white/[0.08] py-6 px-5 sm:px-8 shadow-xs rounded-xl">
          {errorMessage && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username or School Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. instructor1 or admin"
                  className="block w-full pl-9 pr-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-9 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2 px-4 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 mt-4 shadow-xs"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <span className="flex items-center">
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="text-[11px] font-medium text-slate-400 mb-2">
              Quick Test Credentials:
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo('instructor1', 'password123')}
                className="p-2 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] text-left transition-colors"
              >
                <div className="font-medium text-slate-200">Instructor</div>
                <div className="text-[10px] text-slate-500">instructor1</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('depthead', 'password123')}
                className="p-2 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] text-left transition-colors"
              >
                <div className="font-medium text-slate-200">Dept Head</div>
                <div className="text-[10px] text-slate-500">depthead</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('registrar', 'password123')}
                className="p-2 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] text-left transition-colors"
              >
                <div className="font-medium text-slate-200">Registrar</div>
                <div className="text-[10px] text-slate-500">registrar</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('admin', 'admin123')}
                className="p-2 rounded-lg border border-white/[0.06] bg-[#070a12]/50 hover:bg-[#070a12] text-left transition-colors"
              >
                <div className="font-medium text-slate-200">Admin</div>
                <div className="text-[10px] text-slate-500">admin</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footnote */}
        <div className="mt-4 flex items-center justify-center space-x-3 text-[11px] text-slate-500">
          <span className="flex items-center">
            <ShieldCheck className="w-3 h-3 mr-1 text-slate-400" />
            Argon2id Encrypted
          </span>
          <span>•</span>
          <span>School Network Security</span>
        </div>
      </div>
    </div>
  )
}
