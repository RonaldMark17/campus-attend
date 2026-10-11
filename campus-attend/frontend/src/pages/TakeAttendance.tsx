import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  Check,
  RotateCcw,
  Send,
  HelpCircle,
  FileEdit,
  X
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
    fetchOfferings().then((data) => {
      setOfferings(data)
      if (data.length > 0) {
        setSelectedOfferingId(data[0].id)
      }
    }).catch((err) => setError(err.message))
  }, [])

  // 2. Open or fetch attendance meeting session
  const loadMeetingSession = useCallback(async (offeringId = selectedOfferingId, dateStr = meetingDate) => {
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
  }, [selectedOfferingId, meetingDate])

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

  // Quick Action: Mark all present
  const handleMarkAllPresent = () => {
    if (!sheet?.can_edit) return
    setRoster((prev) => prev.map((s) => ({ ...s, status: 'present' })))
  }

  // Quick Action: Reset all unmarked
  const handleResetAll = () => {
    if (!sheet?.can_edit) return
    setRoster((prev) => prev.map((s) => ({ ...s, status: null })))
  }

  // Live Summary calculation
  const tally = roster.reduce(
    (acc, curr) => {
      if (curr.status) {
        acc[curr.status] = (acc[curr.status] || 0) + 1
      } else {
        acc.unmarked += 1
      }
      return acc
    },
    { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 }
  )

  const handleSubmitAttendance = async () => {
    if (!sheet) return
    setIsSubmitting(true)
    setError(null)

    try {
      const recordsToSubmit = roster.map((s) => ({
        enrollment_id: s.enrollment_id,
        status: s.status || 'absent', // If left unmarked, fallback to absent on explicit confirm
        remarks: s.remarks || undefined,
      }))

      const res = await submitAttendanceRoster(sheet.meeting.id, recordsToSubmit)
      setIsConfirmOpen(false)
      setSuccessMessage(res.message)
      // Reload updated sheet
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
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Session Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Class Offering
              </label>
              <select
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                {offerings.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.subject_code} - {off.subject_title} ({off.section_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Meeting Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {sheet && (
            <div className="flex items-center space-x-3 pt-2 lg:pt-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  sheet.meeting.status === 'draft'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : sheet.meeting.status === 'submitted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {sheet.meeting.status === 'draft' ? (
                  <>
                    <FileEdit className="w-3.5 h-3.5 mr-1" />
                    Draft (Unsubmitted)
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Submitted & Locked
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-4 flex items-start space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-start space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          Loading classroom roster and attendance statuses...
        </div>
      ) : !sheet ? (
        <div className="p-16 text-center text-slate-500 text-sm">
          Please select an assigned class offering above to begin.
        </div>
      ) : (
        <>
          {/* Tally & Action Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 sticky top-16 z-40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Tally Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-700 mr-1">Roster: {roster.length}</span>

                <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  {tally.present} Present
                </span>

                <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  {tally.late} Late
                </span>

                <span className="px-2.5 py-1 rounded-lg font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center">
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  {tally.absent} Absent
                </span>

                <span className="px-2.5 py-1 rounded-lg font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  {tally.excused} Excused
                </span>

                {tally.unmarked > 0 && (
                  <span className="px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {tally.unmarked} Unmarked
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {sheet.can_edit && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Mark All Present
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAll}
                    title="Reset Statuses"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                    className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Submit Attendance
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">#</th>
                    <th className="px-6 py-3.5">Student No.</th>
                    <th className="px-6 py-3.5">Student Full Name</th>
                    <th className="px-6 py-3.5">Attendance Status</th>
                    <th className="px-6 py-3.5">Remarks</th>
                    {!sheet.can_edit && <th className="px-6 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {roster.map((student, idx) => (
                    <tr key={student.enrollment_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3 text-slate-400 text-xs font-mono">{idx + 1}</td>
                      <td className="px-6 py-3 font-mono text-xs font-bold text-slate-900">
                        {student.student_number}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {student.full_name}
                      </td>

                      {/* Status Selector */}
                      <td className="px-6 py-3">
                        {sheet.can_edit ? (
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.enrollment_id, 'present')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                student.status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-emerald-700'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.enrollment_id, 'late')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                student.status === 'late'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-amber-700'
                              }`}
                            >
                              Late
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.enrollment_id, 'absent')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                student.status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-rose-700'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentStatus(student.enrollment_id, 'excused')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                student.status === 'excused'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-blue-700'
                              }`}
                            >
                              Excused
                            </button>
                          </div>
                        ) : (
                          <div>
                            {student.status === 'present' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Present
                              </span>
                            )}
                            {student.status === 'late' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Late
                              </span>
                            )}
                            {student.status === 'absent' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Absent
                              </span>
                            )}
                            {student.status === 'excused' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-blue-600" /> Excused
                              </span>
                            )}
                            {!student.status && (
                              <span className="text-xs text-slate-400 italic">Unrecorded</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="px-6 py-3">
                        {sheet.can_edit ? (
                          <input
                            type="text"
                            placeholder="Add remarks..."
                            value={student.remarks || ''}
                            onChange={(e) => setStudentRemarks(student.enrollment_id, e.target.value)}
                            className="w-full max-w-xs px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">{student.remarks || '—'}</span>
                        )}
                      </td>

                      {/* Correction Request for submitted sessions */}
                      {!sheet.can_edit && (
                        <td className="px-6 py-3 text-right">
                          {student.attendance_record_id && (
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionStudent(student)
                                setCorrectionStatus(student.status === 'absent' ? 'excused' : 'present')
                                setCorrectionReason('')
                              }}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              Request Correction
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pre-Submission Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center">
              <Send className="w-5 h-5 mr-2 text-emerald-600" />
              Confirm Attendance Submission
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Please review your recorded attendance exceptions before submitting. Once submitted, this meeting will be locked and changes require formal approval.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-800 pb-2 border-b border-slate-200">
                <span>Class / Section:</span>
                <span>{selectedOffering?.subject_code} • {selectedOffering?.section_name}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Present:</span>
                <span className="font-bold">{tally.present}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>Late:</span>
                <span className="font-bold">{tally.late}</span>
              </div>
              <div className="flex justify-between text-rose-800">
                <span>Absent:</span>
                <span className="font-bold">{tally.absent}</span>
              </div>
              <div className="flex justify-between text-blue-800">
                <span>Excused:</span>
                <span className="font-bold">{tally.excused}</span>
              </div>
              {tally.unmarked > 0 && (
                <div className="flex justify-between text-rose-600 font-bold pt-2 border-t border-slate-200">
                  <span>Unmarked (Will record as Absent):</span>
                  <span>{tally.unmarked}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to Review
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitAttendance}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {correctionStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <HelpCircle className="w-5 h-5 mr-1.5 text-indigo-600" />
                Request Attendance Correction
              </h3>
              <button onClick={() => setCorrectionStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Student: <strong>{correctionStudent.full_name}</strong> ({correctionStudent.student_number})<br />
              Current Status: <span className="uppercase font-bold">{correctionStudent.status}</span>
            </p>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Correct Status *
                </label>
                <select
                  value={correctionStatus}
                  onChange={(e: any) => setCorrectionStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Correction *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explain why this status should be modified (e.g., student presented medical clinic slip after class)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectionStudent(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 disabled:opacity-50"
                >
                  {correctionSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
