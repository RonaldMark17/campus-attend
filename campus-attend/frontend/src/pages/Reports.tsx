import { useEffect, useState, useCallback } from 'react'
import {
  Download,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  BarChart3,
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
  const filteredOfferingStudents = offeringReport?.students.filter((s) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return s.student_name.toLowerCase().includes(q) || s.student_number.toLowerCase().includes(q)
  }) || []

  const filteredDailyRecords = dailyReport?.records.filter((r) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return r.student_name.toLowerCase().includes(q) || r.student_number.toLowerCase().includes(q)
  }) || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
            <BarChart3 className="w-7 h-7 mr-2 text-indigo-600" />
            Attendance Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregate attendance rates • CHED-compliant Absence Thresholds • Local CSV & PDF export engine
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveReportTab('offering')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeReportTab === 'offering'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semester Aggregated
          </button>
          <button
            onClick={() => setActiveReportTab('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeReportTab === 'daily'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Class Sheet
          </button>
          {(user?.role === 'admin' || user?.role === 'dept_head' || user?.role === 'registrar') && (
            <button
              onClick={() => setActiveReportTab('incomplete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeReportTab === 'incomplete'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Incomplete Tracking
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading banner */}
      {loading && (
        <div className="flex items-center space-x-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating report metrics from offline database...</span>
        </div>
      )}

      {/* Control Bar: Offering & Date Selector + Export Buttons */}
      {activeReportTab !== 'incomplete' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Class Offering:
              </label>
              <select
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="text-xs font-bold text-slate-600 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Date:
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Export CSV
                </a>
                <a
                  href={`/api/v1/reports/offering/${selectedOfferingId}/pdf`}
                  download
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
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
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Export Daily CSV
              </a>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards for Offering Report */}
      {activeReportTab === 'offering' && offeringReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Attendance</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {offeringReport.average_attendance_rate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all held sessions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Meetings Held</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {offeringReport.total_meetings_held}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Submitted sessions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {offeringReport.total_enrolled_students}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{offeringReport.section_name} roster</div>
          </div>

          <div className={`p-4 rounded-xl border shadow-sm ${
            offeringReport.students_at_risk_count > 0
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider">Students At Risk (FA)</div>
            <div className="text-2xl font-black mt-1">
              {offeringReport.students_at_risk_count}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">&ge; 20% total absences</div>
          </div>
        </div>
      )}

      {/* Search Input */}
      {activeReportTab !== 'incomplete' && (
        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student number or name..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* VIEW 1: Semester Aggregated Summary */}
        {activeReportTab === 'offering' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 text-center">Sessions</th>
                  <th className="px-4 py-3 text-center text-emerald-700">Present</th>
                  <th className="px-4 py-3 text-center text-amber-700">Late</th>
                  <th className="px-4 py-3 text-center text-rose-700">Absent</th>
                  <th className="px-4 py-3 text-center text-blue-700">Excused</th>
                  <th className="px-4 py-3 text-right">Attendance Rate</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOfferingStudents.map((s) => (
                  <tr key={s.student_id} className={`hover:bg-slate-50/70 ${s.is_at_risk ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      <div className="font-bold text-slate-900">{s.student_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.student_number}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{s.total_meetings}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">{s.present_count}</td>
                    <td className="px-4 py-3 text-center font-bold text-amber-600">{s.late_count}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">{s.absent_count}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">{s.excused_count}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {s.attendance_rate}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.is_at_risk ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          At-Risk (FA)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Good Standing
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
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-4">
                <span className="font-bold text-slate-900">Session Status: <span className="uppercase text-indigo-700">{dailyReport.meeting_status}</span></span>
                <span>Present: <b className="text-emerald-700">{dailyReport.present_count}</b></span>
                <span>Late: <b className="text-amber-700">{dailyReport.late_count}</b></span>
                <span>Absent: <b className="text-rose-700">{dailyReport.absent_count}</b></span>
                <span>Excused: <b className="text-blue-700">{dailyReport.excused_count}</b></span>
              </div>
              <div className="font-bold text-slate-800">
                Daily Rate: <span className="text-emerald-600">{dailyReport.attendance_rate}%</span>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Student Number</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDailyRecords.map((r) => (
                  <tr key={r.student_number} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{r.student_number}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.student_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        r.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'late' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'absent' ? 'bg-rose-100 text-rose-800' :
                        r.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 italic">{r.remarks || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
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
            <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <span>Class sessions that were opened as draft or have missing student entries.</span>
              <span className="font-bold">{incompleteMeetings.length} sessions pending submission</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Subject & Section</th>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="px-4 py-3">Meeting Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center text-amber-700">Unmarked Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {incompleteMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      All class meetings are completely submitted and accounted for!
                    </td>
                  </tr>
                ) : (
                  incompleteMeetings.map((m) => (
                    <tr key={m.meeting_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {m.subject_code} • {m.section_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{m.instructor_name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{m.meeting_date}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600">{m.unmarked_count}</td>
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
