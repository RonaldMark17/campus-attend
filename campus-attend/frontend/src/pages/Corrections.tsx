import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X
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
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Present</span>
      case 'late':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Late</span>
      case 'absent':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">Absent</span>
      case 'excused':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">Excused</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase">{status}</span>
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Attendance Corrections
            </h1>
            {pendingCount > 0 && (
              <span className="text-xs font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {pendingCount} pending review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Department Head and Administrator approval queue for locked attendance rosters
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadRequests()}
            className="inline-flex items-center px-3 py-1.5 border border-white/[0.08] rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {!canReview && (
        <div className="bg-[#0d1322] border border-amber-500/20 rounded-xl p-3.5 flex items-start space-x-2.5 text-slate-300 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Viewing in Read-Only Mode:</span> As an{' '}
            <span className="capitalize font-medium text-slate-200">{user?.role}</span>, you can submit correction requests
            from the Attendance tab. Review and approval is authorized for Department Heads and Administrators.
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3.5 py-2.5 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3.5 py-2.5 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-white/[0.06] bg-[#090d16]/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-slate-800 text-white border border-slate-700/80'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by student, subject..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#090e1b] border-b border-white/[0.06] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4 w-[25%]">Student & Subject</th>
                <th className="py-2.5 px-4 w-[12%]">Meeting Date</th>
                <th className="py-2.5 px-4 text-center w-[18%]">Status Adjustment</th>
                <th className="py-2.5 px-4 w-[25%]">Reason & Justification</th>
                <th className="py-2.5 px-4 text-center w-[10%]">Decision</th>
                {canReview && <th className="py-2.5 px-4 text-right w-[10%]">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading correction queue...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No correction requests found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Student & Subject */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-white text-xs">{req.student_name || 'Student'}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {req.student_number || 'N/A'} • <span className="text-slate-300">{req.subject_code || 'Subject'}</span>
                      </div>
                    </td>

                    {/* Meeting Date */}
                    <td className="py-3 px-4 text-slate-300 tabular-nums">
                      {req.meeting_date || 'N/A'}
                    </td>

                    {/* Status Change */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-1.5">
                        {getStatusBadge(req.current_status || 'unmarked')}
                        <span className="text-slate-500 text-xs">→</span>
                        {getStatusBadge(req.requested_status)}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4">
                      <p className="text-slate-300 text-xs line-clamp-2" title={req.reason}>
                        {req.reason}
                      </p>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        by {req.requested_by_name || 'Instructor'}
                      </div>
                    </td>

                    {/* Review Decision */}
                    <td className="py-3 px-4 text-center">
                      {req.review_status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                      {req.review_status === 'approved' && (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3 mr-1" />
                            Approved
                          </span>
                        </div>
                      )}
                      {req.review_status === 'rejected' && (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <X className="w-3 h-3 mr-1" />
                            Rejected
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions for Dept Head / Admin */}
                    {canReview && (
                      <td className="py-3 px-4 text-right">
                        {req.review_status === 'pending' ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenReview(req, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReview(req, 'rejected')}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Archived</span>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1523] rounded-xl max-w-md w-full shadow-2xl border border-white/[0.1] overflow-hidden text-slate-100">
            <div className="p-4 border-b border-white/[0.08] text-white flex items-center justify-between">
              <h3 className="text-sm font-semibold capitalize">
                {reviewAction} Correction Request
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="p-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400">Student: </span>
                <span className="font-medium text-white">{selectedRequest.student_name}</span> ({selectedRequest.student_number})
              </div>
              <div>
                <span className="text-slate-400">Target Meeting: </span>
                <span className="font-medium text-slate-200">{selectedRequest.meeting_date}</span> ({selectedRequest.subject_code})
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Status Change: </span>
                {getStatusBadge(selectedRequest.current_status || 'unmarked')}
                <span className="text-slate-500">→</span>
                {getStatusBadge(selectedRequest.requested_status)}
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Official Decision Notes / Remarks
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={`Reason for ${reviewAction} this correction...`}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                    reviewAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingReview ? 'Recording...' : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
