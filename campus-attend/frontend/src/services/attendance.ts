export interface AttendanceSheetStudent {
  enrollment_id: string
  student_id: string
  student_number: string
  full_name: string
  gender?: string
  status?: 'present' | 'absent' | 'late' | 'excused' | null
  remarks?: string
  attendance_record_id?: string
}

export interface ClassMeeting {
  id: string
  class_offering_id: string
  meeting_date: string
  start_time?: string
  end_time?: string
  status: 'draft' | 'submitted' | 'closed'
  notes?: string
}

export interface AttendanceSheet {
  meeting: ClassMeeting
  offering: any
  students: AttendanceSheetStudent[]
  can_edit: boolean
  summary: {
    present: number
    late: number
    absent: number
    excused: number
    unmarked: number
  }
}

export interface CorrectionRequest {
  id: string
  attendance_record_id: string
  student_number?: string
  student_name?: string
  subject_code?: string
  meeting_date?: string
  current_status?: string
  requested_status: string
  reason: string
  requested_by_name?: string
  review_status: 'pending' | 'approved' | 'rejected'
  review_notes?: string
  reviewed_by_name?: string
  created_at: string
}

export async function openClassMeeting(offeringId: string, meetingDate: string): Promise<ClassMeeting> {
  const res = await fetch('/api/v1/attendance/meetings/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      class_offering_id: offeringId,
      meeting_date: meetingDate,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to open class meeting.' }))
    throw new Error(err.detail || 'Failed to open class meeting.')
  }
  return res.json()
}

export async function fetchAttendanceSheet(meetingId: string): Promise<AttendanceSheet> {
  const res = await fetch(`/api/v1/attendance/meetings/${meetingId}/sheet`, {
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load attendance sheet.' }))
    throw new Error(err.detail || 'Failed to load attendance sheet.')
  }
  return res.json()
}

export async function submitAttendanceRoster(
  meetingId: string,
  records: Array<{ enrollment_id: string; status: string; remarks?: string }>,
  notes?: string
): Promise<{ submitted_count: number; message: string }> {
  const res = await fetch(`/api/v1/attendance/meetings/${meetingId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ records, notes }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit attendance.' }))
    throw new Error(err.detail || 'Failed to submit attendance.')
  }
  return res.json()
}

export async function submitCorrectionRequest(
  recordId: string,
  requestedStatus: string,
  reason: string
): Promise<CorrectionRequest> {
  const res = await fetch('/api/v1/attendance/corrections/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      attendance_record_id: recordId,
      requested_status: requestedStatus,
      reason,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit correction request.' }))
    throw new Error(err.detail || 'Failed to submit correction request.')
  }
  return res.json()
}

export async function fetchCorrectionRequests(statusFilter?: string): Promise<CorrectionRequest[]> {
  const url = statusFilter
    ? `/api/v1/attendance/corrections?status_filter=${statusFilter}`
    : '/api/v1/attendance/corrections'
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load correction requests.')
  return res.json()
}

export async function reviewCorrectionRequest(
  requestId: string,
  reviewStatus: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<CorrectionRequest> {
  const res = await fetch(`/api/v1/attendance/corrections/${requestId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ review_status: reviewStatus, review_notes: reviewNotes }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to review correction.' }))
    throw new Error(err.detail || 'Failed to review correction.')
  }
  return res.json()
}
