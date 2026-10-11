export interface StudentItem {
  id: string
  student_number: string
  first_name: string
  middle_name?: string
  last_name: string
  suffix?: string
  email?: string
  gender?: string
  program_id: string
  year_level: number
  current_section_id?: string
  status: string
  created_at: string
  program_code?: string
  section_name?: string
}

export interface StudentPagination {
  items: StudentItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CSVRowPreview {
  row_number: number
  student_number: string
  first_name: string
  middle_name?: string
  last_name: string
  program_code: string
  year_level: number
  section_name?: string
  email?: string
  gender?: string
  is_valid: boolean
  errors: string[]
}

export interface CSVPreviewResult {
  total_rows: number
  valid_rows_count: number
  invalid_rows_count: number
  rows: CSVRowPreview[]
}

export async function fetchStudents(
  page = 1,
  pageSize = 15,
  search = '',
  programId = '',
  status = ''
): Promise<StudentPagination> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  })
  if (search) params.append('search', search)
  if (programId) params.append('program_id', programId)
  if (status) params.append('status', status)

  const res = await fetch(`/api/v1/students?${params.toString()}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to load students.')
  return res.json()
}

export async function createStudent(data: any): Promise<StudentItem> {
  const res = await fetch('/api/v1/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create student.' }))
    throw new Error(err.detail || 'Failed to create student.')
  }
  return res.json()
}

export async function archiveStudent(id: string): Promise<void> {
  const res = await fetch(`/api/v1/students/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to archive student.')
}

export async function previewStudentCSV(file: File): Promise<CSVPreviewResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/v1/students/import/preview', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to validate CSV.' }))
    throw new Error(err.detail || 'Failed to validate CSV.')
  }
  return res.json()
}

export async function commitStudentCSV(rows: CSVRowPreview[]): Promise<{ imported_count: number; message: string }> {
  const res = await fetch('/api/v1/students/import/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rows }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to commit CSV.' }))
    throw new Error(err.detail || 'Failed to commit CSV.')
  }
  return res.json()
}
