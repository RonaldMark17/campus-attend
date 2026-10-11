import { useEffect, useState, useCallback } from 'react'
import {
  Download,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Search,
  Loader2,
  X
} from 'lucide-react'
import { fetchOfferings, type ClassOffering } from '../services/academics'
import {
  fetchOfferingReport,
  fetchDailyReport,
  fetchIncompleteMeetings,
  type OfferingAggregatedReport,
  type DailyClassReport,
  type IncompleteMeetingItem
} from '../services/reports'
import { useAuth } from '../hooks/useAuth'

export function ReportsPage() {
  const { user } = useAuth()
  const [offerings, setOfferings] = useState<ClassOffering[]>([])
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('')
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0])

  const [activeReportTab, setActiveReportTab] = useState<'offering' | 'daily' | 'incomplete'>('offering')

  // Reports data state
  const [offeringReport, setOfferingReport] = useState<OfferingAggregatedReport | null>(null)
  const [dailyReport, setDailyReport] = useState<DailyClassReport | null>(null)
  const [incompleteMeetings, setIncompleteMeetings] = useState<IncompleteMeetingItem[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 1. Load active offerings on mount
  useEffect(() => {
    fetchOfferings()
      .then((data) => {
        setOfferings(data)
        if (data.length > 0) {
          setSelectedOfferingId(data[0].id)
        }
      })
      .catch((err) => setError(err.message))
  }, [])

  // 2. Load report depending on active tab
  const loadActiveReport = useCallback(async () => {
    if (!selectedOfferingId && activeReportTab !== 'incomplete') return
    setLoading(true)
    setError(null)

    try {
      if (activeReportTab === 'offering') {
        const data = await fetchOfferingReport(selectedOfferingId)
        setOfferingReport(data)
      } else if (activeReportTab === 'daily') {
        const data = await fetchDailyReport(selectedOfferingId, meetingDate)
        setDailyReport(data)
      } else if (activeReportTab === 'incomplete') {
        const data = await fetchIncompleteMeetings()
        setIncompleteMeetings(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }, [selectedOfferingId, meetingDate, activeReportTab])

  useEffect(() => {
    loadActiveReport()
  }, [loadActiveReport])

  // Filter students in current report
  const filteredOfferingStudents =
    offeringReport?.students.filter((s) => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return s.student_name.toLowerCase().includes(q) || s.student_number.toLowerCase().includes(q)
    }) || []

  const filteredDailyRecords =
    dailyReport?.records.filter((r) => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return r.student_name.toLowerCase().includes(q) || r.student_number.toLowerCase().includes(q)
    }) || []

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Attendance Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregate attendance rates and official reports
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-1 bg-slate-900 border border-white/[0.08] p-1 rounded-lg">
          <button
            onClick={() => setActiveReportTab('offering')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeReportTab === 'offering'
                ? 'bg-slate-800 text-white shadow-xs border border-slate-700/80'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semester Summary
          </button>
          <button
            onClick={() => setActiveReportTab('daily')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeReportTab === 'daily'
                ? 'bg-slate-800 text-white shadow-xs border border-slate-700/80'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Sheet
          </button>
          {(user?.role === 'admin' || user?.role === 'dept_head' || user?.role === 'registrar') && (
            <button
              onClick={() => setActiveReportTab('incomplete')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeReportTab === 'incomplete'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700/80'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Incomplete Sessions
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3.5 py-2.5 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading banner */}
      {loading && (
        <div className="flex items-center space-x-2 text-xs text-slate-300 bg-[#0d1322] border border-white/[0.08] px-3.5 py-2.5 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Generating report metrics from offline database...</span>
        </div>
      )}

      {/* Control Bar: Offering & Date Selector + Export Buttons */}
      {activeReportTab !== 'incomplete' && (
        <div className="bg-[#0d1322] p-4 rounded-xl border border-white/[0.08] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-slate-300 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Class Offering:
              </label>
              <select
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(e.target.value)}
                className="px-3 py-1.5 border border-white/[0.1] rounded-lg text-xs text-white bg-[#070a12] focus:outline-none focus:border-emerald-500"
              >
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.subject_code} - {o.section_name} ({o.instructor_name || 'Unassigned'})
                  </option>
                ))}
              </select>
            </div>

            {activeReportTab === 'daily' && (
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-slate-300 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  Date:
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="px-3 py-1.5 border border-white/[0.1] rounded-lg text-xs text-white bg-[#070a12] focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            {activeReportTab === 'offering' && selectedOfferingId && (
              <>
                <a
                  href={`/api/v1/reports/offering/${selectedOfferingId}/csv`}
                  download
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Export CSV
                </a>
                <a
                  href={`/api/v1/reports/offering/${selectedOfferingId}/pdf`}
                  download
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Official PDF
                </a>
              </>
            )}

            {activeReportTab === 'daily' && selectedOfferingId && (
              <a
                href={`/api/v1/reports/daily/csv?offering_id=${selectedOfferingId}&meeting_date=${meetingDate}`}
                download
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Export Daily CSV
              </a>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards for Offering Report */}
      {activeReportTab === 'offering' && offeringReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0d1322] p-4 rounded-xl border border-white/[0.08] shadow-xs">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Average Attendance</div>
            <div className="text-2xl font-bold text-white mt-1 tabular-nums">
              {offeringReport.average_attendance_rate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across all held sessions</div>
          </div>

          <div className="bg-[#0d1322] p-4 rounded-xl border border-white/[0.08] shadow-xs">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Meetings Held</div>
            <div className="text-2xl font-bold text-white mt-1 tabular-nums">
              {offeringReport.total_meetings_held}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Submitted sessions</div>
          </div>

          <div className="bg-[#0d1322] p-4 rounded-xl border border-white/[0.08] shadow-xs">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Enrolled Students</div>
            <div className="text-2xl font-bold text-white mt-1 tabular-nums">
              {offeringReport.total_enrolled_students}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{offeringReport.section_name} roster</div>
          </div>

          <div
            className={`p-4 rounded-xl border shadow-xs ${
              offeringReport.students_at_risk_count > 0
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                : 'bg-[#0d1322] border-white/[0.08] text-slate-300'
            }`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">At-Risk Students (FA)</div>
            <div className="text-2xl font-bold mt-1 text-white tabular-nums">
              {offeringReport.students_at_risk_count}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">&ge; 20% total absences</div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] shadow-xs overflow-hidden">
        {/* Search Header */}
        {activeReportTab !== 'incomplete' && (
          <div className="p-3 border-b border-white/[0.06] bg-[#090d16]/50 flex items-center justify-between">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student no. or name..."
                className="w-full pl-8 pr-3 py-1.5 border border-white/[0.1] rounded-lg text-xs bg-[#070a12] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* VIEW 1: Semester Aggregated Summary */}
        {activeReportTab === 'offering' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#090e1b] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4 text-center">Sessions</th>
                  <th className="py-2.5 px-4 text-center text-emerald-400">Present</th>
                  <th className="py-2.5 px-4 text-center text-amber-400">Late</th>
                  <th className="py-2.5 px-4 text-center text-rose-400">Absent</th>
                  <th className="py-2.5 px-4 text-center text-sky-400">Excused</th>
                  <th className="py-2.5 px-4 text-right">Attendance Rate</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filteredOfferingStudents.map((s) => (
                  <tr key={s.student_id} className={`hover:bg-white/[0.02] ${s.is_at_risk ? 'bg-rose-500/5' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white text-xs">{s.student_name}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{s.student_number}</div>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-300">{s.total_meetings}</td>
                    <td className="py-3 px-4 text-center tabular-nums font-medium text-emerald-400">{s.present_count}</td>
                    <td className="py-3 px-4 text-center tabular-nums font-medium text-amber-400">{s.late_count}</td>
                    <td className="py-3 px-4 text-center tabular-nums font-medium text-rose-400">{s.absent_count}</td>
                    <td className="py-3 px-4 text-center tabular-nums font-medium text-sky-400">{s.excused_count}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-white">
                      {s.attendance_rate}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.is_at_risk ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          At-Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Good
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: Daily Class Sheet */}
        {activeReportTab === 'daily' && dailyReport && (
          <div className="overflow-x-auto">
            <div className="p-3 bg-[#090d16]/50 border-b border-white/[0.06] flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-3 text-slate-400">
                <span className="font-medium text-white">
                  Status: <span className="uppercase text-slate-200">{dailyReport.meeting_status}</span>
                </span>
                <span>Present: <b className="text-emerald-400 tabular-nums">{dailyReport.present_count}</b></span>
                <span>Late: <b className="text-amber-400 tabular-nums">{dailyReport.late_count}</b></span>
                <span>Absent: <b className="text-rose-400 tabular-nums">{dailyReport.absent_count}</b></span>
                <span>Excused: <b className="text-sky-400 tabular-nums">{dailyReport.excused_count}</b></span>
              </div>
              <div className="font-semibold text-white">
                Daily Rate: <span className="text-emerald-400 tabular-nums">{dailyReport.attendance_rate}%</span>
              </div>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#090e1b] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Student Number</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4">Remarks</th>
                  <th className="py-2.5 px-4 text-right">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filteredDailyRecords.map((r) => (
                  <tr key={r.student_number} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-medium text-slate-200 tabular-nums">{r.student_number}</td>
                    <td className="py-3 px-4 font-medium text-white">{r.student_name}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                          r.status === 'present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : r.status === 'absent'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : r.status === 'excused'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{r.remarks || '—'}</td>
                    <td className="py-3 px-4 text-right text-slate-400 tabular-nums">
                      {r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: Incomplete Meetings Tracking */}
        {activeReportTab === 'incomplete' && (
          <div className="overflow-x-auto">
            <div className="p-3 bg-[#090d16]/50 border-b border-white/[0.06] text-slate-300 text-xs flex items-center justify-between">
              <span>Sessions opened as draft or containing missing roster entries.</span>
              <span className="font-medium text-amber-300">{incompleteMeetings.length} sessions pending</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#090e1b] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Subject & Section</th>
                  <th className="py-2.5 px-4">Instructor</th>
                  <th className="py-2.5 px-4">Meeting Date</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center text-amber-400">Unmarked Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {incompleteMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      All class meetings are completely submitted and accounted for.
                    </td>
                  </tr>
                ) : (
                  incompleteMeetings.map((m) => (
                    <tr key={m.meeting_id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-medium text-white">
                        {m.subject_code} • {m.section_name}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{m.instructor_name}</td>
                      <td className="py-3 px-4 text-slate-400 tabular-nums">{m.meeting_date}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-amber-400 tabular-nums">{m.unmarked_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
