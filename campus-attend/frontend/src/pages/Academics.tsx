import { useEffect, useState } from 'react'
import {
  Clock,
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Academics & Curricula
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Active academic term offerings, curricula, and schedule collision validator
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading academic offerings and schedules...
        </div>
      ) : error ? (
        <div className="p-3.5 bg-rose-500/10 text-rose-300 text-xs rounded-lg border border-rose-500/20">
          {error}
        </div>
      ) : (
        <>
          {/* Active Terms Summary Banner */}
          <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Active Term
              </span>
              <h2 className="text-base font-semibold text-white mt-1.5">
                {terms.find((t) => t.is_current)?.name || 'Term Active'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                Term Window: {terms[0]?.start_date} to {terms[0]?.end_date}
              </p>
            </div>

            <div className="flex gap-2.5 text-xs">
              <div className="p-3 bg-[#070a12] border border-white/[0.08] rounded-lg text-center min-w-20">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Programs</span>
                <span className="text-lg font-bold text-white tabular-nums">{programs.length}</span>
              </div>
              <div className="p-3 bg-[#070a12] border border-white/[0.08] rounded-lg text-center min-w-20">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Sections</span>
                <span className="text-lg font-bold text-white tabular-nums">{sections.length}</span>
              </div>
              <div className="p-3 bg-[#070a12] border border-white/[0.08] rounded-lg text-center min-w-20">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Offerings</span>
                <span className="text-lg font-bold text-white tabular-nums">{offerings.length}</span>
              </div>
            </div>
          </div>

          {/* Class Offerings Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center">
              <Layers className="w-4 h-4 mr-1.5 text-slate-400" />
              Active Class Offerings ({offerings.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offerings.map((off) => (
                <div
                  key={off.id}
                  className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-4 flex flex-col justify-between shadow-xs hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60">
                        {off.subject_code}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {off.section_name}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-white line-clamp-1 mb-2">
                      {off.subject_title}
                    </h4>

                    <div className="text-xs text-slate-400 space-y-1 mb-3">
                      <div className="flex items-center">
                        <UserCheck className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        <span>{off.instructor_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        <span>{off.room || 'Room TBD'}</span>
                      </div>
                    </div>

                    {/* Schedules */}
                    <div className="border-t border-white/[0.06] pt-2.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Timetable:
                      </span>
                      {off.schedules.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">No schedule slots defined</span>
                      ) : (
                        <div className="space-y-1">
                          {off.schedules.map((s, idx) => (
                            <div key={idx} className="text-xs text-slate-300 tabular-nums flex items-center">
                              <Clock className="w-3 h-3 mr-1 text-slate-500" />
                              <span>
                                {daysOfWeek[s.day_of_week]}: {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                      {off.enrolled_count} Students Enrolled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Conflict Demonstration Tool */}
          <div className="bg-[#0d1322] rounded-xl border border-white/[0.08] p-5 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                Timetable Schedule Conflict Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Test server-side collision validation for classrooms, instructors, and student sections.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Day of Week</label>
                <select
                  value={conflictDay}
                  onChange={(e) => setConflictDay(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {daysOfWeek.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                <input
                  type="time"
                  value={conflictStart}
                  onChange={(e) => setConflictStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                <input
                  type="time"
                  value={conflictEnd}
                  onChange={(e) => setConflictEnd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Room</label>
                <input
                  type="text"
                  value={conflictRoom}
                  onChange={(e) => setConflictRoom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#070a12] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConflict}
                disabled={conflictTesting}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {conflictTesting ? 'Checking Collision...' : 'Test Conflict Check'}
              </button>

              {conflictResult && (
                <div
                  className={`text-xs p-2.5 rounded-lg border flex items-center space-x-2 ${
                    conflictResult.has_conflict
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}
                >
                  {conflictResult.has_conflict ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Conflict ({conflictResult.conflict_type}):</strong>{' '}
                        {conflictResult.message}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
