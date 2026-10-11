export interface DailyAttendanceRecordItem {
  student_number: string
  student_name: string
  gender?: string
  status: 'present' | 'absent' | 'late' | 'excused' | 'unmarked'
  remarks?: string
  recorded_at?: string
}

export interface DailyClassReport {
  class_offering_id: string
  subject_code: string
  subject_title: string
  section_name: string
  instructor_name: string
  meeting_date: string
  meeting_status: string
  total_enrolled: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  unmarked_count: number
  attendance_rate: number
  records: DailyAttendanceRecordItem[]
}

export interface OfferingStudentSummary {
  student_id: string
  student_number: string
  student_name: string
  total_meetings: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  attendance_rate: number
  absence_rate: number
  is_at_risk: boolean
}

export interface OfferingAggregatedReport {
  class_offering_id: string
  subject_code: string
  subject_title: string
  section_name: string
  term_name: string
  instructor_name: string
  total_meetings_held: number
  total_enrolled_students: number
  average_attendance_rate: number
  students_at_risk_count: number
  students: OfferingStudentSummary[]
}

export interface IncompleteMeetingItem {
  meeting_id: string
  class_offering_id: string
  subject_code: string
  section_name: string
  instructor_name: string
  meeting_date: string
  status: string
  unmarked_count: number
}

export async function fetchDailyReport(offeringId: string, meetingDate: string): Promise<DailyClassReport> {
  const res = await fetch(`/api/v1/reports/daily?offering_id=${offeringId}&meeting_date=${meetingDate}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to load daily attendance report.')
  return res.json()
}

export async function fetchOfferingReport(offeringId: string): Promise<OfferingAggregatedReport> {
  const res = await fetch(`/api/v1/reports/offering/${offeringId}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to load offering aggregated summary.')
  return res.json()
}

export async function fetchIncompleteMeetings(): Promise<IncompleteMeetingItem[]> {
  const res = await fetch('/api/v1/reports/incomplete', {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to load incomplete meetings report.')
  return res.json()
}
