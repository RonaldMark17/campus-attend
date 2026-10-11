import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  Download,
  Filter
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
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
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
      const validRows = csvPreview.rows.filter((r) => r.is_valid)
      const result = await commitStudentCSV(validRows)
      setCsvSuccess(`Successfully imported ${result.imported_count} student records!`)
      loadStudents(1, '')
      setCsvPreview(null)
      setCsvFile(null)
    } catch (err: any) {
      setCsvError(err.message || 'Failed to commit CSV records.')
    } finally {
      setCsvCommitLoading(false)
    }
  }

  const downloadSampleCsv = () => {
    const sample = `student_number,first_name,middle_name,last_name,suffix,gender,year_level,program_code,email
2026-10041,Maria,Santos,Dela Cruz,,Female,1,BSCS,maria.delacruz@student.school.lan
2026-10042,Juan,Reyes,Bautista,Jr.,Male,1,BSIT,juan.bautista@student.school.lan`
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'campusattend_student_template.csv'
    a.click()
  }

  const canManage = user?.role === 'admin' || user?.role === 'registrar'

  // Filter students by selected program if chosen
  const filteredStudents = useMemo(() => {
    if (selectedProgram === 'all') return students
    return students.filter((s) => s.program_code === selectedProgram)
  }, [students, selectedProgram])

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-semibold text-white tracking-tight">Students</h1>
            <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
              {total} enrolled
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional directory and student academic records
          </p>
        </div>

        {canManage && (
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                setCsvError(null)
                setCsvSuccess(null)
                setCsvPreview(null)
                setIsImportOpen(true)
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Import CSV
            </button>
            <button
              onClick={() => {
                setAddError(null)
                if (programs.length > 0 && !addForm.program_id) {
                  setAddForm((prev) => ({ ...prev, program_id: programs[0].id }))
                }
                setIsAddOpen(true)
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Student
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card with Integrated Filter Bar */}
      <div className="bg-[#0d1322] border border-white/[0.08] rounded-xl shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-white/[0.06] bg-[#090d16]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student no. or name..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
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
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </form>

          {/* Program Quick Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="bg-[#070a12] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Degree Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading student records...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-400 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No students found matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#090e1b]">
                  <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[15%]">
                    Student No.
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[32%]">
                    Name
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[13%]">
                    Program
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[14%]">
                    Section
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[10%]">
                    Year Level
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[10%]">
                    Status
                  </th>
                  {canManage && (
                    <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right w-[6%]">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200 tabular-nums">
                      {std.student_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100">
                        {std.last_name}, {std.first_name} {std.middle_name || ''} {std.suffix || ''}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {std.email || 'No email registered'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/60">
                        {std.program_code || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {std.section_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      Year {std.year_level}
                    </td>
                    <td className="py-3 px-4">
                      {std.status === 'active' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        {std.status === 'active' && (
                          <button
                            onClick={() => handleArchive(std.id, std.student_number)}
                            title="Deactivate Student"
                            className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors"
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-[#090d16]/70 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalPages}</span> ({total} total records)
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => loadStudents(page - 1, search)}
              disabled={page <= 1}
              className="p-1.5 border border-white/[0.08] rounded-md hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-300"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => loadStudents(page + 1, search)}
              disabled={page >= totalPages}
              className="p-1.5 border border-white/[0.08] rounded-md hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-300"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal (Dark Mode Enterprise) */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1523] rounded-xl shadow-2xl border border-white/[0.1] max-w-lg w-full p-5 text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-semibold text-white flex items-center">
                <Plus className="w-4 h-4 mr-1.5 text-emerald-400" />
                Register Individual Student
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg p-3">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Student Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-10050"
                  value={addForm.student_number}
                  onChange={(e) => setAddForm({ ...addForm, student_number: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Program *</label>
                  <select
                    required
                    value={addForm.program_id}
                    onChange={(e) => setAddForm({ ...addForm, program_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Section</label>
                  <select
                    value={addForm.current_section_id}
                    onChange={(e) => setAddForm({ ...addForm, current_section_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">Year Level</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={addForm.year_level}
                    onChange={(e) => setAddForm({ ...addForm, year_level: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gender</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  School Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="student@school.lan"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 border border-white/[0.1] rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal (Dark Mode Enterprise) */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1523] rounded-xl shadow-2xl border border-white/[0.1] max-w-2xl w-full p-5 max-h-[90vh] flex flex-col text-slate-100">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Import Students from CSV
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Validates student numbers and degree programs before writing to database.
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {csvError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{csvError}</span>
              </div>
            )}

            {csvSuccess && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg p-3 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{csvSuccess}</span>
              </div>
            )}

            {/* Upload Area */}
            <div className="mb-4 p-5 border border-dashed border-slate-700 rounded-xl bg-slate-900/40 text-center">
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
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-200">
                  {csvFile ? csvFile.name : 'Select or drop a CSV file to validate'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Institutional format: student_number, first_name, last_name, program_code
                </span>
              </label>

              <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-center">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center text-xs font-medium text-emerald-400 hover:underline"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download Sample CSV Template
                </button>
              </div>
            </div>

            {csvLoading && (
              <div className="text-center py-6 text-xs text-slate-400">
                Parsing and validating rows...
              </div>
            )}

            {/* Validation Preview Table */}
            {csvPreview && (
              <div className="flex-1 overflow-hidden flex flex-col mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-slate-300">Validation Breakdown:</span>
                  <div className="space-x-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {csvPreview.valid_rows_count} Valid
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                      {csvPreview.invalid_rows_count} Invalid
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-white/[0.08] rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#090e1b] sticky top-0 border-b border-white/[0.08] font-medium text-slate-400">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Student No.</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Program</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {csvPreview.rows.map((row) => (
                        <tr
                          key={row.row_number}
                          className={row.is_valid ? 'hover:bg-white/[0.02]' : 'bg-rose-500/5'}
                        >
                          <td className="p-2 text-slate-500">{row.row_number}</td>
                          <td className="p-2 font-medium text-slate-200 tabular-nums">
                            {row.student_number || '—'}
                          </td>
                          <td className="p-2 text-slate-300">
                            {row.last_name}, {row.first_name}
                          </td>
                          <td className="p-2 text-slate-300">{row.program_code}</td>
                          <td className="p-2">
                            {row.is_valid ? (
                              <span className="inline-flex items-center text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Ready
                              </span>
                            ) : (
                              <div className="text-rose-400">
                                <span className="inline-flex items-center font-medium">
                                  <XCircle className="w-3.5 h-3.5 mr-1" />
                                  Error
                                </span>
                                <ul className="list-disc list-inside text-[11px] mt-0.5 text-rose-300">
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

            <div className="flex justify-end space-x-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-3 py-1.5 border border-white/[0.1] rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              {csvPreview && csvPreview.valid_rows_count > 0 && (
                <button
                  type="button"
                  disabled={csvCommitLoading}
                  onClick={handleCommitCsv}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
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
