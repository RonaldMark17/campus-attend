import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  FileSpreadsheet,
  X,
  Download
} from 'lucide-react'
import {
  fetchStudents,
  createStudent,
  archiveStudent,
  previewStudentCSV,
  commitStudentCSV,
  type StudentItem,
  type CSVPreviewResult
} from '../services/students'
import { fetchPrograms, fetchSections, type Program, type Section } from '../services/academics'
import { useAuth } from '../hooks/useAuth'

export function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reference data
  const [programs, setPrograms] = useState<Program[]>([])
  const [sections, setSections] = useState<Section[]>([])

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Add form state
  const [addForm, setAddForm] = useState({
    student_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    program_id: '',
    year_level: 1,
    current_section_id: '',
    gender: 'Male',
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CSVPreviewResult | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvCommitLoading, setCsvCommitLoading] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null)

  const loadStudents = useCallback(async (targetPage = page, searchTerm = search) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStudents(targetPage, 15, searchTerm)
      setStudents(data.items)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.total_pages)
    } catch (err: any) {
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadStudents(1, '')
    fetchPrograms().then(setPrograms).catch(() => {})
    fetchSections().then(setSections).catch(() => {})
  }, [loadStudents])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadStudents(1, search)
  }

  const handleArchive = async (id: string, sNum: string) => {
    if (!window.confirm(`Are you sure you want to deactivate student ${sNum}?`)) return
    try {
      await archiveStudent(id)
      loadStudents(page, search)
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate student')
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setIsSubmitting(true)
    try {
      await createStudent({
        ...addForm,
        current_section_id: addForm.current_section_id || null,
        email: addForm.email || null,
      })
      setIsAddOpen(false)
      setAddForm({
        student_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        program_id: programs[0]?.id || '',
        year_level: 1,
        current_section_id: '',
        gender: 'Male',
      })
      loadStudents(1, '')
    } catch (err: any) {
      setAddError(err.message || 'Failed to create student profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    setCsvLoading(true)
    setCsvError(null)
    setCsvSuccess(null)
    setCsvPreview(null)

    try {
      const preview = await previewStudentCSV(file)
      setCsvPreview(preview)
    } catch (err: any) {
      setCsvError(err.message || 'Failed to parse CSV file.')
    } finally {
      setCsvLoading(false)
    }
  }

  const handleCommitCsv = async () => {
    if (!csvPreview || csvPreview.valid_rows_count === 0) return
    setCsvCommitLoading(true)
    setCsvError(null)
    try {
      const res = await commitStudentCSV(csvPreview.rows.filter(r => r.is_valid))
      setCsvSuccess(res.message)
      setCsvPreview(null)
      setCsvFile(null)
      loadStudents(1, '')
    } catch (err: any) {
      setCsvError(err.message || 'Failed to commit import.')
    } finally {
      setCsvCommitLoading(false)
    }
  }

  const downloadSampleCsv = () => {
    const sample = `student_number,first_name,middle_name,last_name,program_code,year_level,section_name,email,gender\n2026-90001,Juan,Carlos,Dela Cruz,BSCS,1,BSCS 1-A,juan.delacruz@student.school.lan,Male\n2026-90002,Maria,Clara,Santos,BSIT,1,BSIT 1-A,maria.santos@student.school.lan,Female`
    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'campusattend_student_template.csv'
    a.click()
  }

  const canManage = user?.role === 'admin' || user?.role === 'registrar'

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-emerald-600" />
            Student Directory
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Institutional directory • {total} Registered Students
          </p>
        </div>

        {canManage && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setCsvError(null)
                setCsvSuccess(null)
                setCsvPreview(null)
                setIsImportOpen(true)
              }}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Import CSV
            </button>
            <button
              onClick={() => {
                setAddError(null)
                if (programs.length > 0 && !addForm.program_id) {
                  setAddForm(prev => ({ ...prev, program_id: programs[0].id }))
                }
                setIsAddOpen(true)
              }}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Student
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student number, last name, or first name..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                loadStudents(1, '')
              }}
              className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading student records...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 text-sm flex items-center justify-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Student No.</th>
                  <th className="px-6 py-3.5">Full Name</th>
                  <th className="px-6 py-3.5">Program</th>
                  <th className="px-6 py-3.5">Section</th>
                  <th className="px-6 py-3.5">Year</th>
                  <th className="px-6 py-3.5">Status</th>
                  {canManage && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {students.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {std.student_number}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {std.last_name}, {std.first_name} {std.middle_name || ''} {std.suffix || ''}
                      </div>
                      <div className="text-xs text-slate-400">{std.email || 'No email registered'}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-slate-800">{std.program_code || '—'}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      {std.section_name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      Year {std.year_level}
                    </td>
                    <td className="px-6 py-3.5">
                      {std.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          <UserX className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-6 py-3.5 text-right">
                        {std.status === 'active' && (
                          <button
                            onClick={() => handleArchive(std.id, std.student_number)}
                            title="Deactivate Student"
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing Page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({total} Total Records)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadStudents(page - 1, search)}
              disabled={page <= 1}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadStudents(page + 1, search)}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Plus className="w-5 h-5 mr-1.5 text-emerald-600" />
                Register Individual Student
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-10050"
                  value={addForm.student_number}
                  onChange={(e) => setAddForm({ ...addForm, student_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Program *</label>
                  <select
                    required
                    value={addForm.program_id}
                    onChange={(e) => setAddForm({ ...addForm, program_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={addForm.current_section_id}
                    onChange={(e) => setAddForm({ ...addForm, current_section_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">(None / Unassigned)</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year Level</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={addForm.year_level}
                    onChange={(e) => setAddForm({ ...addForm, year_level: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">School Email (Optional)</label>
                <input
                  type="email"
                  placeholder="student@school.lan"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <FileSpreadsheet className="w-5 h-5 mr-1.5 text-indigo-600" />
                  Bulk Student CSV Import & Dry-Run Preview
                </h3>
                <p className="text-xs text-slate-500">
                  Pre-validates student numbers, programs, and format before writing to database.
                </p>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {csvError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{csvError}</span>
              </div>
            )}

            {csvSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{csvSuccess}</span>
              </div>
            )}

            {/* Upload Area */}
            <div className="mb-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
              <input
                type="file"
                accept=".csv"
                id="csvInput"
                onChange={handleCsvFileChange}
                className="hidden"
              />
              <label
                htmlFor="csvInput"
                className="cursor-pointer inline-flex flex-col items-center justify-center"
              >
                <Upload className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="text-sm font-semibold text-slate-800">
                  {csvFile ? csvFile.name : 'Choose a CSV file to validate'}
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Click to browse from your device
                </span>
              </label>

              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-center">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download Sample CSV Template
                </button>
              </div>
            </div>

            {csvLoading && (
              <div className="text-center py-6 text-sm text-slate-500">
                Parsing and validating rows...
              </div>
            )}

            {/* Validation Preview Table */}
            {csvPreview && (
              <div className="flex-1 overflow-hidden flex flex-col mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700">Validation Breakdown:</span>
                  <div className="space-x-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {csvPreview.valid_rows_count} Valid
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                      {csvPreview.invalid_rows_count} Invalid
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Student No.</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Program</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvPreview.rows.map((row) => (
                        <tr
                          key={row.row_number}
                          className={row.is_valid ? 'bg-white' : 'bg-rose-50/50'}
                        >
                          <td className="p-2 text-slate-500">{row.row_number}</td>
                          <td className="p-2 font-mono font-bold text-slate-800">
                            {row.student_number || '—'}
                          </td>
                          <td className="p-2">
                            {row.last_name}, {row.first_name}
                          </td>
                          <td className="p-2 font-semibold">{row.program_code}</td>
                          <td className="p-2">
                            {row.is_valid ? (
                              <span className="inline-flex items-center text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Ready
                              </span>
                            ) : (
                              <div className="text-rose-700">
                                <span className="inline-flex items-center font-bold">
                                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                                  Error
                                </span>
                                <ul className="list-disc list-inside text-[11px] mt-0.5 text-rose-800">
                                  {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              {csvPreview && csvPreview.valid_rows_count > 0 && (
                <button
                  type="button"
                  disabled={csvCommitLoading}
                  onClick={handleCommitCsv}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                  {csvCommitLoading
                    ? 'Importing...'
                    : `Commit Import (${csvPreview.valid_rows_count} Valid Students)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
