export interface AcademicTerm {
  id: string
  code: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  is_active: boolean
}

export interface Program {
  id: string
  department_id: string
  code: string
  name: string
  is_active: boolean
}

export interface Section {
  id: string
  program_id: string
  academic_term_id: string
  year_level: number
  name: string
}

export interface ClassSchedule {
  id: string
  class_offering_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room?: string
}

export interface ClassOffering {
  id: string
  academic_term_id: string
  subject_id: string
  section_id: string
  instructor_id: string
  room?: string
  status: string
  created_at: string
  subject_code?: string
  subject_title?: string
  section_name?: string
  instructor_name?: string
  enrolled_count: number
  schedules: ClassSchedule[]
}

export async function fetchAcademicTerms(): Promise<AcademicTerm[]> {
  const res = await fetch('/api/v1/academics/terms', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load terms')
  return res.json()
}

export async function fetchPrograms(): Promise<Program[]> {
  const res = await fetch('/api/v1/academics/programs', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load programs')
  return res.json()
}

export async function fetchSections(): Promise<Section[]> {
  const res = await fetch('/api/v1/academics/sections', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load sections')
  return res.json()
}

export async function fetchOfferings(): Promise<ClassOffering[]> {
  const res = await fetch('/api/v1/academics/offerings', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load offerings')
  return res.json()
}

export async function checkScheduleConflict(payload: any): Promise<{ has_conflict: boolean; conflict_type?: string; message?: string }> {
  const res = await fetch('/api/v1/academics/schedules/check-conflict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to check schedule conflict')
  return res.json()
}
