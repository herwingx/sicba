import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  PlusCircleIcon, ClipboardListIcon, Users2Icon, BookOpenIcon,
  Loader2Icon, CheckIcon, TrashIcon, PlayCircleIcon, PauseCircleIcon,
  BarChart2Icon, TrophyIcon, CheckCircle2Icon,
} from 'lucide-react'
import { DateTimePicker } from '@/components/date-time-picker'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Exam {
  id: string
  title: string
  subject: { name: string }
  isActive: boolean
  startTime: string
  endTime: string
  timeLimit: number
  _count: { questions: number; participations: number }
  // Para alumno: su participación propia
  myParticipation?: { status: string; score: number | null } | null
}

interface ExamResult {
  rank: number
  participationId: string
  studentId: string
  studentName: string
  status: string
  score: number | null
  startedAt: string | null
  finishedAt: string | null
  durationMin: number | null
}

interface Subject {
  id: string
  name: string
}

interface Question {
  id: string
  content: string
  difficulty: number
}

interface ExamManagerProps {
  onEnterExam?: (examId: string) => void
}

const API = 'http://localhost:3000'

/**
 * Componente para la gestión y listado de exámenes.
 * Se adapta según el rol del usuario (Admin/Maestro vs Alumno).
 */
export function ExamManager({ onEnterExam }: ExamManagerProps) {
  // Se obtiene el token y rol para determinar los permisos en la vista (RBAC básico).
  const token = localStorage.getItem('sicba_token')
  const role = localStorage.getItem('sicba_role')

  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  // Estado para modal de resultados (admin)
  const [resultsExam, setResultsExam] = useState<Exam | null>(null)
  const [examResults, setExamResults] = useState<ExamResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)

  // Form state
  const [form, setForm] = useState({ title: '', subjectId: '', timeLimit: '60' })
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [formError, setFormError] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  const loadExams = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/exams`, { headers })
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    } catch {
      toast.error('No se pudieron cargar los exámenes.')
    } finally {
      setLoading(false)
    }
  }

  const loadSubjects = async () => {
    setSubjectsLoading(true)
    try {
      const t = localStorage.getItem('sicba_token')
      const res = await fetch(`${API}/api/subjects`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('sicba_token')
        localStorage.removeItem('sicba_role')
        window.location.reload()
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSubjects(Array.isArray(data) ? data : [])
      } else {
        console.error('[subjects] Status:', res.status)
      }
    } catch (err) {
      console.error('[subjects] fetch error:', err)
    } finally {
      setSubjectsLoading(false)
    }
  }

  const loadQuestions = async (subjectId: string) => {
    try {
      const res = await fetch(`${API}/api/questions?subjectId=${subjectId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setQuestions(Array.isArray(data) ? data : (data.questions ?? []))
      }
    } catch { /* silencioso */ }
  }

  useEffect(() => { loadExams(); loadSubjects() }, [])

  const handleSubjectChange = (val: string) => {
    setForm((f) => ({ ...f, subjectId: val }))
    setSelectedQuestionIds([])
    loadQuestions(val)
  }

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    )
  }

  const handleCreate = async () => {
    if (!startDate || !endDate) {
      setFormError('Selecciona la fecha y hora de inicio y fin.')
      return
    }
    if (selectedQuestionIds.length === 0) {
      setFormError('Selecciona al menos una pregunta.')
      return
    }

    setCreating(true)
    setFormError('')
    try {
      const res = await fetch(`${API}/api/exams`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          questionIds: selectedQuestionIds,
          timeLimit: Number(form.timeLimit),
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Error al crear el examen.')
      } else {
        setDialogOpen(false)
        setForm({ title: '', subjectId: '', timeLimit: '60' })
        setStartDate(undefined)
        setEndDate(undefined)
        setSelectedQuestionIds([])
        setQuestions([])
        toast.success('Examen creado correctamente. Publícalo cuando estés listo.')
        loadExams()
      }
    } catch {
      setFormError('No se pudo conectar con el servidor.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      const res = await fetch(`${API}/api/exams/${deleteTargetId}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Examen eliminado correctamente.')
        loadExams()
      } else {
        toast.error(data.error || 'Error al eliminar el examen.')
      }
    } catch {
      toast.error('Error de conexión al intentar eliminar.')
    } finally {
      setDeleteTargetId(null)
    }
  }

  const handlePublish = async (exam: Exam) => {
    setPublishingId(exam.id)
    try {
      const res = await fetch(`${API}/api/exams/${exam.id}/publish`, {
        method: 'PATCH',
        headers,
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        loadExams()
      } else {
        toast.error(data.error || 'Error al cambiar el estado del examen.')
      }
    } catch {
      toast.error('Error de conexión.')
    } finally {
      setPublishingId(null)
    }
  }

  /**
   * Obtiene los resultados detallados de un examen específico.
   * Utilizado exclusivamente por administradores para ver el rendimiento de los alumnos.
   */
  const loadResults = async (exam: Exam) => {
    setResultsExam(exam)
    setResultsLoading(true)
    try {
      const res = await fetch(`${API}/api/exams/${exam.id}/results`, { headers })
      if (res.ok) {
        const data = await res.json()
        setExamResults(data.results || [])
      } else {
        toast.error('No se pudieron cargar los resultados.')
      }
    } catch {
      toast.error('Error de conexión.')
    } finally {
      setResultsLoading(false)
    }
  }

  // Bandera principal para diferenciar el flujo de creación/administración (admin) 
  // del flujo de participación (alumno).
  const isAdmin = role === 'ADMIN' || role === 'MAESTRO'

  // Truncar contenido de pregunta para mostrar en lista (elimina LaTeX $...$)
  const truncateQuestion = (content: string, max = 72) => {
    const clean = content.replace(/\$[^$]*\$/g, '[fórmula]').replace(/\\[a-zA-Z]+\{[^}]*\}/g, '[fórmula]')
    return clean.length > max ? clean.slice(0, max) + '…' : clean
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exámenes</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Gestiona y crea concursos de Ciencias Básicas' : 'Concursos disponibles para participar'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setDialogOpen(true); loadSubjects() }}>
            <PlusCircleIcon data-icon="inline-start" />
            Crear Examen
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon className="size-5 text-primary" />
            Lista de Exámenes
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'Todos los exámenes del sistema.' : 'Exámenes en los que puedes participar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
              <ClipboardListIcon className="size-10 opacity-30" />
              <p className="text-sm">
                {isAdmin ? 'No hay exámenes creados. ¡Crea el primero!' : 'No hay exámenes disponibles por ahora.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead className="text-center"><BookOpenIcon className="size-4 inline" /></TableHead>
                  <TableHead className="text-center"><Users2Icon className="size-4 inline" /></TableHead>
                  <TableHead>Tiempo</TableHead>
                  <TableHead>Estado</TableHead>
                  {!isAdmin && <TableHead className="text-center">Mi Puntaje</TableHead>}
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => {
                  const now = new Date()
                  const start = new Date(exam.startTime)
                  const end = new Date(exam.endTime)
                  const isLive = exam.isActive && now >= start && now <= end
                  const isUpcoming = exam.isActive && now < start
                  const isDraft = !exam.isActive
                  const isFinished = exam.isActive && now > end
                  const myPart = exam.myParticipation

                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell><Badge variant="outline">{exam.subject.name}</Badge></TableCell>
                      <TableCell className="text-center text-sm">{exam._count.questions}</TableCell>
                      <TableCell className="text-center text-sm">{exam._count.participations}</TableCell>
                      <TableCell className="text-sm">{exam.timeLimit} min</TableCell>
                      <TableCell>
                        {isLive && <Badge className="bg-green-600 dark:bg-green-700 text-white">En vivo</Badge>}
                        {isUpcoming && <Badge variant="secondary">Próximamente</Badge>}
                        {isDraft && <Badge variant="outline" className="text-muted-foreground">Borrador</Badge>}
                        {isFinished && <Badge variant="outline">Finalizado</Badge>}
                      </TableCell>
                      {!isAdmin && (
                        <TableCell className="text-center">
                          {myPart?.status === 'SUBMITTED' && myPart.score !== null ? (
                            <Badge variant="secondary" className="font-bold border-green-200 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                              {myPart.score}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {/* Alumno: botón ingresar o ver resultado */}
                        {!isAdmin && isLive && myPart?.status !== 'SUBMITTED' && (
                          <Button size="sm" onClick={() => onEnterExam?.(exam.id)}>
                            Ingresar
                          </Button>
                        )}
                        {!isAdmin && myPart?.status === 'SUBMITTED' && (
                          <Button size="sm" variant="outline" onClick={() => onEnterExam?.(exam.id)}>
                            Ver Resultados
                          </Button>
                        )}
                        {!isAdmin && !isLive && myPart?.status !== 'SUBMITTED' && (
                          <span className="text-xs text-muted-foreground">
                            {isDraft ? 'No disponible' : isFinished ? 'Finalizado' : 'Próximamente'}
                          </span>
                        )}

                        {/* Admin: Publicar + Ver Resultados + Eliminar */}
                        {isAdmin && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadResults(exam)}
                            >
                              <BarChart2Icon className="size-4 mr-1" />
                              Resultados
                            </Button>
                            <Button
                              size="sm"
                              variant={exam.isActive ? 'secondary' : 'default'}
                              onClick={() => handlePublish(exam)}
                              disabled={publishingId === exam.id}
                            >
                              {publishingId === exam.id
                                ? <Loader2Icon className="size-4 animate-spin" />
                                : exam.isActive
                                  ? <><PauseCircleIcon data-icon="inline-start" />Despublicar</>
                                  : <><PlayCircleIcon data-icon="inline-start" />Publicar</>
                              }
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteTargetId(exam.id)}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog: Confirmar borrado */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este examen?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán el examen y todas sus preguntas asociadas.
              Las participaciones también serán eliminadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Crear Examen */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Examen</DialogTitle>
            <DialogDescription>
              Selecciona la materia, las preguntas del banco y configura el horario. El examen se creará como borrador.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{formError}</p>
            )}

            {/* Título */}
            <div className="grid gap-2">
              <Label htmlFor="exam-title">Título del examen</Label>
              <Input id="exam-title" placeholder="Ej. Concurso Cálculo — Sep 2026"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Materia */}
            <div className="grid gap-2">
              <Label htmlFor="exam-subject">Materia</Label>
              {subjectsLoading ? (
                <div className="h-9 w-full rounded-md border bg-muted animate-pulse" />
              ) : subjects.length > 0 ? (
                <Select value={form.subjectId} onValueChange={handleSubjectChange}>
                  <SelectTrigger id="exam-subject">
                    <SelectValue placeholder="Selecciona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Input id="exam-subject" placeholder="ID de la materia (UUID)"
                    value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} />
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">No se pudieron cargar las materias.</p>
                    <button onClick={loadSubjects} className="text-xs text-primary underline">Reintentar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Preguntas — nombres reales, no UUIDs */}
            {questions.length > 0 ? (
              <div className="grid gap-2">
                <Label>
                  Preguntas del Banco{' '}
                  <span className="text-muted-foreground text-xs">({selectedQuestionIds.length} seleccionadas)</span>
                </Label>
                <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                  {questions.map((q) => {
                    const selected = selectedQuestionIds.includes(q.id)
                    return (
                      <button
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 ${selected ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`mt-0.5 size-4 shrink-0 rounded border ${selected ? 'bg-primary border-primary' : 'border-border'} flex items-center justify-center`}>
                          {selected && <CheckIcon className="size-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Nombre real del reactivo, no UUID */}
                          <p className="leading-snug">{truncateQuestion(q.content)}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs ml-1">
                          {'⭐'.repeat(q.difficulty)}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : form.subjectId ? (
              <div className="grid gap-2">
                <Label>IDs de Preguntas (separados por coma)</Label>
                <Textarea
                  placeholder="uuid1, uuid2, uuid3..."
                  value={selectedQuestionIds.join(', ')}
                  onChange={(e) => setSelectedQuestionIds(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  rows={3}
                />
              </div>
            ) : null}

            {/* Tiempo límite */}
            <div className="grid gap-2">
              <Label htmlFor="exam-timelimit">Tiempo límite (minutos)</Label>
              <Input id="exam-timelimit" type="number" min={1}
                value={form.timeLimit} onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))} />
            </div>

            {/* DateTimePicker — grilla que da suficiente espacio a cada campo */}
            <div className="grid gap-4">
              <DateTimePicker label="Fecha y hora de inicio" id="exam-start" value={startDate} onChange={setStartDate} />
              <DateTimePicker label="Fecha y hora de fin" id="exam-end" value={endDate} onChange={setEndDate} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setFormError('') }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.title || !form.subjectId}>
              {creating && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              {creating ? 'Creando...' : 'Crear Borrador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Resultados (Admin) */}
      <Dialog open={!!resultsExam} onOpenChange={(open) => !open && setResultsExam(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <TrophyIcon className="size-5 text-primary" />
                  Resultados del Concurso
                </DialogTitle>
                <DialogDescription className="mt-1.5">
                  {resultsExam?.title} • {resultsExam?.subject.name}
                </DialogDescription>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                <div className="flex items-center gap-2">
                  <Users2Icon className="size-4" />
                  {examResults.length} participantes
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-green-600" />
                  {examResults.filter(r => r.status === 'SUBMITTED').length} entregados
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {resultsLoading ? (
              <div className="flex flex-col gap-3 p-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : examResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                <BarChart2Icon className="size-12 opacity-20" />
                <p>Nadie ha participado en este examen todavía.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Rank</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Tiempo</TableHead>
                    <TableHead className="text-right">Puntaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examResults.map((res) => (
                    <TableRow key={res.participationId} className={res.rank === 1 ? 'bg-yellow-500/5 dark:bg-yellow-500/10' : ''}>
                      <TableCell className="text-center font-bold">
                        {res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : res.rank}
                      </TableCell>
                      <TableCell className="font-medium">{res.studentName}</TableCell>
                      <TableCell className="text-center">
                        {res.status === 'SUBMITTED' ? (
                          <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                            Entregado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            En curso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {res.durationMin !== null ? `${res.durationMin} min` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {res.score !== null ? (
                          <span className={res.score >= 70 ? 'text-green-600 font-bold dark:text-green-400' : 'font-medium'}>
                            {res.score.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setResultsExam(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
