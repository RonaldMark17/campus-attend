import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Search,
  Check,
  X,
  FileText
} from 'lucide-react'
import {
  fetchCorrectionRequests,
  reviewCorrectionRequest,
  type CorrectionRequest
} from '../services/attendance'
import { useAuth } from '../hooks/useAuth'

export function CorrectionsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<CorrectionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Review modal state
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null)
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved')
  const [reviewNotes, setReviewNotes] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const canReview = user?.role === 'dept_head' || user?.role === 'admin'

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCorrectionRequests(statusFilter === 'all' ? undefined : statusFilter)
      setRequests(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load correction requests.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleOpenReview = (req: CorrectionRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(req)
    setReviewAction(action)
    setReviewNotes('')
  }

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest) return
    setSubmittingReview(true)
    setError(null)

    try {
      await reviewCorrectionRequest(
        selectedRequest.id,
        reviewAction,
        reviewNotes || (reviewAction === 'approved' ? 'Approved as requested.' : 'Rejected.')
      )
      setSuccessMessage(
        `Correction request for ${selectedRequest.student_name || 'student'} was successfully ${reviewAction}.`
      )
      setSelectedRequest(null)
      loadRequests()
    } catch (err: any) {
      setError(err.message || 'Failed to record review decision.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (r.student_name && r.student_name.toLowerCase().includes(q)) ||
      (r.student_number && r.student_number.toLowerCase().includes(q)) ||
      (r.subject_code && r.subject_code.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q)) ||
      (r.requested_by_name && r.requested_by_name.toLowerCase().includes(q))
    )
  })

  const pendingCount = requests.filter((r) => r.review_status === 'pending').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">Present</span>
      case 'late':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">Late</span>
      case 'absent':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">Absent</span>
      case 'excused':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">Excused</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">{status}</span>
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
            <FileCheck2 className="w-7 h-7 mr-2 text-indigo-600" />
            Attendance Corrections
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official correction workflow for submitted rosters • Department Head & Administrator approval required
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadRequests()}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {!canReview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Viewing in Read-Only Mode:</span> As an{' '}
            <span className="capitalize font-semibold">{user?.role}</span>, you can submit correction requests
            from the Take Attendance tab. Review and approval of requests is restricted to Department Heads and System Administrators.
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors flex items-center ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
              {status === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, code, or instructor..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Student & Subject</th>
                <th className="px-4 py-3">Meeting Date</th>
                <th className="px-4 py-3 text-center">Status Change</th>
                <th className="px-4 py-3">Instructor Justification</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3 text-center">Review Decision</th>
                {canReview && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={canReview ? 7 : 6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading correction audit trail...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={canReview ? 7 : 6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No attendance correction requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student & Subject */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{req.student_name || 'Student'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {req.student_number || 'N/A'} • <span className="font-semibold text-indigo-600">{req.subject_code || 'Subject'}</span>
                      </div>
                    </td>

                    {/* Meeting Date */}
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {req.meeting_date || 'N/A'}
                    </td>

                    {/* Status Change */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center space-x-1.5">
                        {getStatusBadge(req.current_status || 'unmarked')}
                        <span className="text-slate-400 font-bold">➔</span>
                        {getStatusBadge(req.requested_status)}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-slate-800 line-clamp-2" title={req.reason}>
                        {req.reason}
                      </p>
                    </td>

                    {/* Requested By */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{req.requested_by_name || 'Instructor'}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Review Decision */}
                    <td className="px-4 py-3 text-center">
                      {req.review_status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Review
                        </span>
                      )}
                      {req.review_status === 'approved' && (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 mr-1" />
                            Approved
                          </span>
                          {req.reviewed_by_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5">by {req.reviewed_by_name}</div>
                          )}
                        </div>
                      )}
                      {req.review_status === 'rejected' && (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="w-3 h-3 mr-1" />
                            Rejected
                          </span>
                          {req.reviewed_by_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5">by {req.reviewed_by_name}</div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions for Dept Head / Admin */}
                    {canReview && (
                      <td className="px-4 py-3 text-right">
                        {req.review_status === 'pending' ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenReview(req, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReview(req, 'rejected')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold shadow-sm transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Closed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-4 border-b text-white flex items-center justify-between ${
              reviewAction === 'approved' ? 'bg-emerald-700' : 'bg-rose-700'
            }`}>
              <div className="flex items-center space-x-2 font-bold text-sm">
                {reviewAction === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-200" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-200" />
                )}
                <span>
                  {reviewAction === 'approved' ? 'Approve Attendance Correction' : 'Reject Correction Request'}
                </span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div>
                  <span className="font-semibold text-slate-500">Student: </span>
                  <span className="font-bold text-slate-900">{selectedRequest.student_name}</span> ({selectedRequest.student_number})
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Requested Change: </span>
                  <span className="capitalize font-medium text-slate-700">{selectedRequest.current_status}</span> ➔{' '}
                  <span className="capitalize font-bold text-indigo-700">{selectedRequest.requested_status}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Instructor's Reason: </span>
                  <span className="italic text-slate-800">"{selectedRequest.reason}"</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Review Note / Audit Justification
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approved'
                      ? 'e.g. Verified with attached medical slip from college clinic.'
                      : 'e.g. Disapproved due to exceeding the 7-day correction window.'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This decision will be permanently committed to the security audit log.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 ${
                    reviewAction === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingReview
                    ? 'Recording Decision...'
                    : reviewAction === 'approved'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
