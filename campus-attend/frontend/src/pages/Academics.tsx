import { useEffect, useState } from 'react'
import {
  BookOpen,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  UserCheck
} from 'lucide-react'
import {
  fetchOfferings,
  fetchAcademicTerms,
  fetchPrograms,
  fetchSections,
  checkScheduleConflict,
  type ClassOffering,
  type AcademicTerm,
  type Program,
  type Section
} from '../services/academics'

export function AcademicsPage() {
  const [offerings, setOfferings] = useState<ClassOffering[]>([])
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Conflict tester modal state
  const [conflictDay, setConflictDay] = useState(1) // Monday
  const [conflictStart, setConflictStart] = useState('09:30')
  const [conflictEnd, setConflictEnd] = useState('10:30')
  const [conflictRoom, setConflictRoom] = useState('ComLab 101')
  const [conflictResult, setConflictResult] = useState<any | null>(null)
  const [conflictTesting, setConflictTesting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchOfferings(),
      fetchAcademicTerms(),
      fetchPrograms(),
      fetchSections(),
    ])
      .then(([offs, tms, prgs, secs]) => {
        setOfferings(offs)
        setTerms(tms)
        setPrograms(prgs)
        setSections(secs)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const handleTestConflict = async () => {
    if (!offerings.length) return
    setConflictTesting(true)
    try {
      const sample = offerings[0]
      const res = await checkScheduleConflict({
        instructor_id: sample.instructor_id,
        section_id: sample.section_id,
        room: conflictRoom,
        day_of_week: conflictDay,
        start_time: conflictStart + ':00',
        end_time: conflictEnd + ':00',
      })
      setConflictResult(res)
    } catch (err: any) {
      setConflictResult({ has_conflict: true, message: err.message })
    } finally {
      setConflictTesting(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
          Academics & Class Schedule Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Active Terms, Curricula, Sections, and Timetable Conflict Prevention
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading academic offerings and schedules...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-200">
          {error}
        </div>
      ) : (
        <>
          {/* Active Terms Summary Banner */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                Active Academic Term
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {terms.find((t) => t.is_current)?.name || 'Term Active'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dates: {terms[0]?.start_date} to {terms[0]?.end_date}
              </p>
            </div>

            <div className="flex gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Programs</span>
                <span className="text-lg font-bold text-slate-900">{programs.length}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Sections</span>
                <span className="text-lg font-bold text-slate-900">{sections.length}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Offerings</span>
                <span className="text-lg font-bold text-slate-900">{offerings.length}</span>
              </div>
            </div>
          </div>

          {/* Class Offerings Grid */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-indigo-600" />
              Active Class Offerings & Schedules ({offerings.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offerings.map((off) => (
                <div
                  key={off.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {off.subject_code}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {off.section_name}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">
                      {off.subject_title}
                    </h4>

                    <div className="text-xs text-slate-600 space-y-1 mb-4">
                      <div className="flex items-center">
                        <UserCheck className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>{off.instructor_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>{off.room || 'Room TBD'}</span>
                      </div>
                    </div>

                    {/* Schedules */}
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Timetable:
                      </span>
                      {off.schedules.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No schedule slots defined</span>
                      ) : (
                        <div className="space-y-1">
                          {off.schedules.map((s) => (
                            <div
                              key={s.id}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex items-center justify-between text-slate-700 font-mono"
                            >
                              <span>{daysOfWeek[s.day_of_week]}</span>
                              <span className="text-indigo-700 font-semibold">
                                {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {off.enrolled_count} Students Enrolled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Conflict Demonstration Tool */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-amber-600" />
                  Timetable Schedule Conflict Detector
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Test server-side collision validation for classrooms, instructors, and student sections.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
                <select
                  value={conflictDay}
                  onChange={(e) => setConflictDay(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  {daysOfWeek.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={conflictStart}
                  onChange={(e) => setConflictStart(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={conflictEnd}
                  onChange={(e) => setConflictEnd(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Room</label>
                <input
                  type="text"
                  value={conflictRoom}
                  onChange={(e) => setConflictRoom(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConflict}
                disabled={conflictTesting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {conflictTesting ? 'Checking...' : 'Simulate Schedule Conflict Check'}
              </button>

              {conflictResult && (
                <div
                  className={`text-xs p-3 rounded-lg border flex items-center space-x-2 ${
                    conflictResult.has_conflict
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {conflictResult.has_conflict ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Conflict Detected ({conflictResult.conflict_type}):</strong>{' '}
                        {conflictResult.message}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>No Collision:</strong> Time slot and room are available.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
