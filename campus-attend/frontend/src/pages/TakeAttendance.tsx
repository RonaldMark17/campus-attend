import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Check,
  RotateCcw,
  Send,
  FileEdit,
  Lock,
  BookOpen
} from 'lucide-react'
import { fetchOfferings, type ClassOffering } from '../services/academics'
import {
  openClassMeeting,
  fetchAttendanceSheet,
  submitAttendanceRoster,
  submitCorrectionRequest,
  type AttendanceSheetStudent,
  type AttendanceSheet
} from '../services/attendance'

export function TakeAttendancePage() {
  const [offerings, setOfferings] = useState<ClassOffering[]>([])
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('')
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0])

  const [sheet, setSheet] = useState<AttendanceSheet | null>(null)
  const [roster, setRoster] = useState<AttendanceSheetStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Pre-submission confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Correction request modal
  const [correctionStudent, setCorrectionStudent] = useState<AttendanceSheetStudent | null>(null)
  const [correctionStatus, setCorrectionStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present')
  const [correctionReason, setCorrectionReason] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)

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

  // 2. Open or fetch attendance meeting session
  const loadMeetingSession = useCallback(
    async (offeringId = selectedOfferingId, dateStr = meetingDate) => {
      if (!offeringId || !dateStr) return
      setLoading(true)
      setError(null)
      setSuccessMessage(null)

      try {
        const meeting = await openClassMeeting(offeringId, dateStr)
        const sheetData = await fetchAttendanceSheet(meeting.id)
        setSheet(sheetData)
        setRoster(sheetData.students)
      } catch (err: any) {
        setError(err.message || 'Failed to open class meeting.')
        setSheet(null)
        setRoster([])
      } finally {
        setLoading(false)
      }
    },
    [selectedOfferingId, meetingDate]
  )

  useEffect(() => {
    if (selectedOfferingId) {
      loadMeetingSession(selectedOfferingId, meetingDate)
    }
  }, [selectedOfferingId, meetingDate, loadMeetingSession])

  // Status updates
  const setStudentStatus = (enrollmentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    if (!sheet?.can_edit) return
    setRoster((prev) =>
      prev.map((s) => (s.enrollment_id === enrollmentId ? { ...s, status } : s))
    )
  }

  const setStudentRemarks = (enrollmentId: string, remarks: string) => {
    if (!sheet?.can_edit) return
    setRoster((prev) =>
      prev.map((s) => (s.enrollment_id === enrollmentId ? { ...s, remarks } : s))
    )
  }

  const markAllPresent = () => {
    if (!sheet?.can_edit) return
    setRoster((prev) => prev.map((s) => ({ ...s, status: 'present' })))
  }

  const resetAllStatuses = () => {
    if (!sheet?.can_edit) return
    setRoster((prev) => prev.map((s) => ({ ...s, status: null })))
  }

  // Calculate live stats
  const totalStudents = roster.length
  const markedStudents = roster.filter((s) => s.status !== null).length
  const progressPercent = totalStudents > 0 ? Math.round((markedStudents / totalStudents) * 100) : 0

  const tally = {
    present: roster.filter((s) => s.status === 'present').length,
    late: roster.filter((s) => s.status === 'late').length,
    absent: roster.filter((s) => s.status === 'absent').length,
    excused: roster.filter((s) => s.status === 'excused').length,
    unmarked: roster.filter((s) => s.status === null).length,
  }

  const attendanceRate = totalStudents > 0 ? Math.round(((tally.present + tally.late) / totalStudents) * 100) : 0

  const handleSubmitAttendance = async () => {
    if (!sheet) return
    setIsSubmitting(true)
    setError(null)
    try {
      const records = roster.map((s) => ({
        enrollment_id: s.enrollment_id,
        status: s.status || 'absent',
        remarks: s.remarks || undefined,
      }))

      await submitAttendanceRoster(sheet.meeting.id, records)
      setIsConfirmOpen(false)
      setSuccessMessage('Attendance roll committed and officially locked.')
      loadMeetingSession(selectedOfferingId, meetingDate)
    } catch (err: any) {
      setError(err.message || 'Failed to submit attendance.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correctionStudent?.attendance_record_id || !correctionReason.trim()) return

    setCorrectionSubmitting(true)
    setError(null)
    try {
      await submitCorrectionRequest(
        correctionStudent.attendance_record_id,
        correctionStatus,
        correctionReason.trim()
      )
      setCorrectionStudent(null)
      setCorrectionReason('')
      setSuccessMessage('Correction request submitted to Department Head for review.')
      loadMeetingSession(selectedOfferingId, meetingDate)
    } catch (err: any) {
      setError(err.message || 'Failed to request correction.')
    } finally {
      setCorrectionSubmitting(false)
    }
  }

  const selectedOffering = offerings.find((o) => o.id === selectedOfferingId)

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Session Controls Card */}
      <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Select Class Offering
              </label>
              <select
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {offerings.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.subject_code} - {off.subject_title} ({off.section_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Meeting Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {sheet && (
            <div className="flex items-center space-x-3 pt-2 lg:pt-0">
              <span
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                  sheet.meeting.status === 'draft'
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : sheet.meeting.status === 'submitted'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {sheet.meeting.status === 'draft' ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Draft (Editable)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Locked (Official Record)</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Live Progress Bar & Stats */}
        {sheet && (
          <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-200">Roll Call Progress:</span>
                <span className="text-emerald-400 font-semibold tabular-nums">{markedStudents}/{totalStudents} students ({progressPercent}%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Class Rate:</span>
                <span className="text-white font-semibold tabular-nums">{attendanceRate}%</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/[0.04]">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Quick Status Pill Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Present: <b className="ml-1 text-white tabular-nums">{tally.present}</b>
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Late: <b className="ml-1 text-white tabular-nums">{tally.late}</b>
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Absent: <b className="ml-1 text-white tabular-nums">{tally.absent}</b>
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Excused: <b className="ml-1 text-white tabular-nums">{tally.excused}</b>
                </span>
              </div>

              {sheet.can_edit && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={markAllPresent}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80 transition-colors"
                  >
                    <Check className="w-3 h-3 mr-1 text-emerald-400" />
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={resetAllStatuses}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg p-3 flex items-center space-x-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg p-3 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Locked Notice Banner */}
      {sheet && !sheet.can_edit && (
        <div className="bg-[#0d1322] border border-white/[0.08] rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>This class meeting is officially locked. Use the pencil icon on individual students to submit an administrative correction request.</span>
          </div>
        </div>
      )}

      {/* Student Roster Table Card */}
      <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-white/[0.06] bg-[#090d16]/50 flex items-center justify-between">
          <div className="font-semibold text-white text-xs">
            {selectedOffering ? `${selectedOffering.subject_code} - ${selectedOffering.section_name} Roll Call` : 'Class Roll Call'}
          </div>
          <span className="text-xs text-slate-400 tabular-nums">{roster.length} Enrolled</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#090e1b] border-b border-white/[0.06] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4 w-[35%]">Student</th>
                <th className="py-2.5 px-4 text-center w-[30%]">Status Selection</th>
                <th className="py-2.5 px-4 w-[25%]">Remarks</th>
                {!sheet?.can_edit && <th className="py-2.5 px-4 text-right w-[10%]">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {loading && roster.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Loading student roll call...
                  </td>
                </tr>
              ) : roster.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No enrolled students found for this class offering.
                  </td>
                </tr>
              ) : (
                roster.map((student) => {
                  return (
                    <tr key={student.enrollment_id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Student Info with Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-xs text-slate-200">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-white text-xs">{student.full_name}</div>
                            <div className="text-[11px] text-slate-400 tabular-nums">{student.student_number}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-[#070a12] border border-white/[0.08] space-x-0.5">
                          {(['present', 'late', 'absent', 'excused'] as const).map((st) => {
                            const isSelected = student.status === st
                            const badgeColors = {
                              present: isSelected ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white',
                              late: isSelected ? 'bg-amber-600 text-white font-medium' : 'text-slate-400 hover:text-white',
                              absent: isSelected ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white',
                              excused: isSelected ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-white',
                            }[st]

                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={!sheet?.can_edit}
                                onClick={() => setStudentStatus(student.enrollment_id, st)}
                                className={`px-2 py-0.5 rounded text-[11px] uppercase font-medium transition-colors disabled:cursor-not-allowed ${badgeColors}`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      {/* Remarks Input */}
                      <td className="py-3 px-4">
                        {sheet?.can_edit ? (
                          <input
                            type="text"
                            value={student.remarks || ''}
                            onChange={(e) => setStudentRemarks(student.enrollment_id, e.target.value)}
                            placeholder="Add remark..."
                            className="w-full px-2.5 py-1 bg-[#070a12] border border-white/[0.1] rounded-md text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        ) : (
                          <span className="text-slate-400 italic text-xs">{student.remarks || '—'}</span>
                        )}
                      </td>

                      {/* Correction Action (when locked) */}
                      {!sheet?.can_edit && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionStudent(student)
                              setCorrectionStatus(student.status || 'present')
                              setCorrectionReason('')
                            }}
                            className="inline-flex items-center px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Submit Correction Request"
                          >
                            <FileEdit className="w-3.5 h-3.5 mr-1" />
                            Correct
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Action Commit Footer */}
        {sheet?.can_edit && roster.length > 0 && (
          <div className="p-3.5 bg-[#090d16]/70 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Confirm roster marks before finalizing. Changes will lock session.
            </span>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Submit Attendance Session
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1523] border border-white/[0.1] rounded-xl max-w-md w-full shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white">
              Confirm Official Attendance Submission
            </h3>
            <p className="text-xs text-slate-300">
              You are committing attendance for <b>{roster.length} students</b>. Once submitted, this session will be officially locked.
            </p>
            <div className="bg-[#070a12] p-3 rounded-lg border border-white/[0.08] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Present:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{tally.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Late:</span>
                <span className="font-semibold text-amber-400 tabular-nums">{tally.late}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Absent:</span>
                <span className="font-semibold text-rose-400 tabular-nums">{tally.absent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Excused:</span>
                <span className="font-semibold text-sky-400 tabular-nums">{tally.excused}</span>
              </div>
              {tally.unmarked > 0 && (
                <div className="flex justify-between pt-1.5 border-t border-white/[0.08] text-amber-300 font-medium">
                  <span>Unmarked (will default to Absent):</span>
                  <span className="tabular-nums">{tally.unmarked}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitAttendance}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Committing...' : 'Confirm & Commit Roster'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {correctionStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1523] border border-white/[0.1] rounded-xl max-w-md w-full shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-white font-semibold text-base">
              <FileEdit className="w-4 h-4 text-emerald-400" />
              <span>Request Attendance Correction</span>
            </div>
            <form onSubmit={handleCorrectionSubmit} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Student: </span>
                <span className="font-medium text-white">{correctionStudent.full_name}</span> ({correctionStudent.student_number})
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Requested Status</label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused (Medical/Official)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason & Justification</label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explain justification for correction..."
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionStudent(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {correctionSubmitting ? 'Submitting...' : 'Send to Dept Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
