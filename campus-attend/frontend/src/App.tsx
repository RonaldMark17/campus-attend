import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { StudentsPage } from './pages/Students'
import { AcademicsPage } from './pages/Academics'
import { TakeAttendancePage } from './pages/TakeAttendance'
import { CorrectionsPage } from './pages/Corrections'
import { ReportsPage } from './pages/Reports'
import { Navbar, type NavTab } from './components/Navbar'
import { Clock } from 'lucide-react'

function MainContent() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Clock className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm text-slate-400">Verifying secure session over LAN...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'attendance' && <TakeAttendancePage />}
        {activeTab === 'corrections' && <CorrectionsPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'students' && <StudentsPage />}
        {activeTab === 'academics' && <AcademicsPage />}
      </main>
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}

export default App
