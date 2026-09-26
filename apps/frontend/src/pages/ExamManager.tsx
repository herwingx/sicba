import { useState, useEffect } from 'react'
import Latex from 'react-latex-next'
import 'katex/dist/katex.min.css'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
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
  BarChart2Icon, TrophyIcon, PencilIcon, AlertCircleIcon,
  CopyIcon,
  KeyIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { DateTimePicker } from '@/components/date-time-picker'
import { toast } from 'sonner'

/**
 * Representa la información general y estado de un examen.
 */
interface Exam {
  /** Identificador único del examen */
  id: string
  /** Título del examen */
  title: string
  /** Materia a la que pertenece el examen */
  subject: { name: string }
  /** Indica si el examen está activo o publicado */
  isActive: boolean
  /** Código de acceso para que los alumnos puedan unirse */
  accessCode: string | null
  /** Fecha y hora ISO de inicio */
  startTime: string
  /** Fecha y hora ISO de creación */
  createdAt: string
  /** Fecha y hora ISO de finalización */
  endTime: string
  /** Duración máxima permitida en minutos */
  timeLimit: number
  /** Conteo acumulado de preguntas y participantes */
  _count: { questions: number; participations: number }
  // Para alumno: su participación propia
  /** Participación del alumno autenticado en el examen */
  myParticipation?: { status: string; score: number | null } | null
}

/**
 * Información de desempeño y clasificación de un alumno en un examen.
 */
interface ExamResult {
  /** Posición en el ranking de resultados */
  rank: number
  /** Identificador de la participación */
  participationId: string
  /** Identificador del alumno */
  studentId: string
  /** Nombre completo del estudiante */
  studentName: string
  /** Estado actual de la participación (ej. 'SUBMITTED') */
  status: string
  /** Puntaje o calificación obtenida (0 - 100) */
  score: number | null
  /** Fecha y hora ISO de inicio de resolución */
  startedAt: string | null
  /** Fecha y hora ISO de envío o finalización */
  finishedAt: string | null
  /** Tiempo empleado en minutos */
  durationMin: number | null
}

/**
 * Materia o área de conocimiento asociada a un examen.
 */
interface Subject {
  /** Identificador de la materia */
  id: string
  /** Nombre descriptivo de la materia */
  name: string
}

/**
 * Reactivo o pregunta del banco disponible para los exámenes.
 */
interface Question {
  /** Identificador único de la pregunta */
  id: string
  /** Enunciado o contenido de la pregunta */
  content: string
  /** Nivel de dificultad asignado */
  difficulty: number
}

/**
 * Propiedades recibidas por el componente ExamManager.
 */
interface ExamManagerProps {
  /** Función callback ejecutada para ingresar a resolver un examen */
  onEnterExam?: (examId: string) => void
  /** Función callback ejecutada para consultar los resultados de un examen */
  onViewResult?: (examId: string) => void
}

const API = 'http://localhost:3000'

/**
 * Componente principal para la gestión, administración y resolución de exámenes.
 * Adapta la vista y acciones disponibles según el rol de usuario (Admin/Maestro vs Alumno).
 *
 * @param props Propiedades de navegación para ingresar o ver resultados de un examen.
 */
export function ExamManager({ onEnterExam, onViewResult }: ExamManagerProps) {
  // Se obtiene el token y rol para determinar los permisos en la vista (RBAC básico).
  const token = localStorage.getItem('sicba_token')
  const role = localStorage.getItem('sicba_role')

  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
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

  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Estado para enroll
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollCode, setEnrollCode] = useState('')
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  // Form state
  const [form, setForm] = useState({ title: '', subjectId: '', timeLimit: '60' })
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [formError, setFormError] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  /**
   * Obtiene la lista actualizada de exámenes disponibles desde el servidor.
   */
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

  /**
   * Carga el catálogo de materias registradas para los formularios de examen.
   */
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

  /**
   * Obtiene los reactivos disponibles asociados a la materia especificada.
   *
   * @param subjectId Identificador de la materia a consultar.
   */
  const loadQuestions = async (subjectId: string) => {
    setQuestionsLoading(true)
    try {
      const res = await fetch(`${API}/api/questions?subjectId=${subjectId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setQuestions(Array.isArray(data) ? data : (data.questions ?? []))
      }
    } catch { /* silencioso */ }
    finally {
      setQuestionsLoading(false)
    }
  }

  useEffect(() => { loadExams(); loadSubjects() }, [])

  /**
   * Actualiza la materia seleccionada en el formulario y consulta sus preguntas asociadas.
   *
   * @param val Identificador de la materia seleccionada.
   */
  const handleSubjectChange = (val: string) => {
    setForm((f) => ({ ...f, subjectId: val }))
    setSelectedQuestionIds([])
    loadQuestions(val)
  }

  /**
   * Agrega o elimina una pregunta de la selección actual del examen.
   *
   * @param id Identificador de la pregunta a alternar.
   */
  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    )
  }

  /**
   * Valida y envía los datos para dar de alta un nuevo examen en estado borrador.
   */
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

  /**
   * Ejecuta la eliminación del examen seleccionado y actualiza la lista.
   */
  const handleDelete = async (id: string) => {
    if (!id) return
    setDeleteTargetId(null)
    try {
      const res = await fetch(`${API}/api/exams/${id}`, {
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
    }
  }

  /**
   * Guarda las actualizaciones realizadas al examen actualmente en edición.
   */
  const handleEdit = async () => {
    if (!editingExam) return
    setEditSaving(true)
    try {
      const isDraft = !editingExam.isActive
      const body: Record<string, unknown> = {
        startTime: startDate?.toISOString(),
        endTime: endDate?.toISOString(),
      }
      if (isDraft) {
        body.title = form.title
        body.subjectId = form.subjectId
        body.timeLimit = form.timeLimit
        body.questionIds = selectedQuestionIds
      }
      const res = await fetch(`${API}/api/exams/${editingExam.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Examen actualizado correctamente.')
        setEditingExam(null)
        loadExams()
      } else {
        toast.error(data.error || 'Error al guardar los cambios.')
      }
    } catch {
      toast.error('Error de conexión al intentar editar.')
    } finally {
      setEditSaving(false)
    }
  }

  /**
   * Prepara los valores del formulario y abre el modal para editar un examen.
   *
   * @param exam Examen que se desea modificar.
   */
  const openEditModal = (exam: Exam) => {
    setEditingExam(exam)
    setForm({ title: exam.title, subjectId: exam.subject?.name ?? '', timeLimit: String(exam.timeLimit) })
    setStartDate(new Date(exam.startTime))
    setEndDate(new Date(exam.endTime))
    // Pre-cargar preguntas si es borrador
    if (!exam.isActive) {
      setForm((f) => ({ ...f, subjectId: '' })) // trigger reset de questions
    }
  }

  /**
   * Publica o despublica un examen para controlar su disponibilidad para los alumnos.
   *
   * @param exam Examen cuyo estado de publicación cambiará.
   */
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
   * Inscribe al alumno en un examen mediante el código de acceso ingresado.
   */
  const handleEnroll = async () => {
    if (!enrollCode.trim()) {
      setEnrollError('Ingresa un código.')
      return
    }
    setEnrollError('')
    setEnrollLoading(true)
    // Formatear TECABCD a TEC-ABCD si el usuario usó InputOTP
    let codeToSubmit = enrollCode.trim().toUpperCase()
    if (codeToSubmit.length === 7 && codeToSubmit.startsWith('TEC')) {
      codeToSubmit = `${codeToSubmit.slice(0, 3)}-${codeToSubmit.slice(3)}`
    } else if (codeToSubmit.length === 8 && codeToSubmit[3] !== '-') {
      codeToSubmit = `${codeToSubmit.slice(0, 3)}-${codeToSubmit.slice(4)}`
    }

    try {
      const res = await fetch(`${API}/api/exams/enroll`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: codeToSubmit }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Te has unido exitosamente.')
        setEnrollOpen(false)
        setEnrollCode('')
        loadExams() // Recargar lista para ver el nuevo examen
      } else {
        setEnrollError(data.error || 'Código inválido.')
      }
    } catch {
      setEnrollError('Error de conexión al servidor.')
    } finally {
      setEnrollLoading(false)
    }
  }

  /**
   * Obtiene los resultados detallados de un examen específico.
   * Utilizado exclusivamente por administradores para ver el rendimiento de los alumnos.
   *
   * @param exam Examen del cual se consultarán los resultados.
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
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Button variant="outline" onClick={loadExams} disabled={loading} title="Actualizar lista">
            <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {isAdmin ? (
            <Button onClick={() => { 
              setForm({ title: '', subjectId: '', timeLimit: '60' })
              setStartDate(undefined)
              setEndDate(undefined)
              setSelectedQuestionIds([])
              setQuestions([])
              setDialogOpen(true)
              loadSubjects() 
            }}>
              <PlusCircleIcon className="size-4 mr-2" />
              Crear Examen
            </Button>
          ) : (
            <Button onClick={() => setEnrollOpen(true)}>
              <KeyIcon className="size-4 mr-2" />
              Unirme a Concurso
            </Button>
          )}
        </div>
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
                  {isAdmin && <TableHead>Código</TableHead>}
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
                      {isAdmin && (
                        <TableCell>
                          {exam.accessCode ? (
                            <div className="flex items-center gap-1 group">
                              <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm font-semibold">{exam.accessCode}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  navigator.clipboard.writeText(exam.accessCode || '')
                                  toast.success('Código copiado')
                                }}
                              >
                                <CopyIcon className="size-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Al publicar</span>
                          )}
                        </TableCell>
                      )}
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
                        {/* Alumno: botón inscribir, ingresar o ver resultado */}
                        {!isAdmin && isLive && !myPart && (
                          <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
                            <KeyIcon className="size-3.5 mr-1" />
                            Inscribirse
                          </Button>
                        )}
                        {!isAdmin && isLive && myPart && myPart.status !== 'SUBMITTED' && (
                          <Button size="sm" onClick={() => onEnterExam?.(exam.id)}>
                            Ingresar
                          </Button>
                        )}
                        {!isAdmin && myPart?.status === 'SUBMITTED' && (
                          <Button size="sm" variant="outline" onClick={() => onViewResult?.(exam.id)}>
                            Ver Resultados
                          </Button>
                        )}
                        {!isAdmin && !isLive && myPart?.status !== 'SUBMITTED' && (
                          <span className="text-xs text-muted-foreground">
                            {isDraft ? 'No disponible' : isFinished ? 'Finalizado' : 'Próximamente'}
                          </span>
                        )}

                        {/* Admin: Editar + Publicar + Ver Resultados + Eliminar */}
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
                            {/* Botón Editar: solo en Borrador o Publicado (no en Finalizado) */}
                            {!isFinished && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(exam)}
                                title={exam.isActive ? 'Solo puedes editar las fechas' : 'Editar examen'}
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                            )}
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
              onClick={(e) => {
                e.currentTarget.disabled = true;
                handleDelete(deleteTargetId!);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Unirse a Concurso (Alumno) */}
      <Dialog open={enrollOpen} onOpenChange={(open) => { setEnrollOpen(open); if (!open) setEnrollError('') }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unirse a un Concurso</DialogTitle>
            <DialogDescription>
              Ingresa el código proporcionado por tu profesor para inscribirte en el examen.
            </DialogDescription>
          </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <InputOTP 
                maxLength={6} 
                value={enrollCode} 
                onChange={(v) => setEnrollCode(v.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && enrollCode.length === 6 && handleEnroll()}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {enrollError && <p className="text-sm text-destructive">{enrollError}</p>}
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancelar</Button>
            <Button onClick={handleEnroll} disabled={enrollLoading}>
              {enrollLoading ? 'Verificando...' : 'Unirse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Examen */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormError('') }}>
        <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
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
                <Select value={form.subjectId} onValueChange={(val) => handleSubjectChange(val || '')}>
                  <SelectTrigger id="exam-subject">
                    <SelectValue placeholder="Selecciona una materia">
                      {subjects.find(s => s.id === form.subjectId)?.name || 'Selecciona una materia'}
                    </SelectValue>
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
            {questionsLoading ? (
              <div className="grid gap-2">
                <Label>Cargando preguntas...</Label>
                <div className="border rounded-md divide-y h-52 overflow-hidden flex flex-col">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-3 w-full animate-pulse">
                      <div className="size-4 shrink-0 rounded bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-3/4 bg-muted rounded" />
                      </div>
                      <div className="h-4 w-12 shrink-0 bg-muted rounded ml-1" />
                    </div>
                  ))}
                </div>
              </div>
            ) : questions.length > 0 ? (
              <div className="grid gap-2">
                <Label>
                  Preguntas del Banco{' '}
                  <span className="text-muted-foreground text-xs">({selectedQuestionIds.length} seleccionadas)</span>
                </Label>
                <div className="border rounded-md divide-y h-52 overflow-y-auto">
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
                          {/* Nombre real del reactivo con soporte LaTeX y truncamiento por CSS */}
                          <div className="leading-snug line-clamp-2 overflow-hidden text-ellipsis">
                            <Latex>{q.content}</Latex>
                          </div>
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

      {/* Dialog: Editar Examen (Admin) */}
      <Dialog open={!!editingExam} onOpenChange={(open) => !open && setEditingExam(null)}>
        <DialogContent className="sm:max-w-lg max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilIcon className="size-4 text-primary" />
              Editar Examen
            </DialogTitle>
            <DialogDescription>
              {editingExam?.isActive
                ? 'Este examen está publicado. Solo puedes modificar las fechas.'
                : 'Modifica el título, fechas, tiempo y preguntas del borrador.'}
            </DialogDescription>
          </DialogHeader>

          {/* Aviso cuando está publicado */}
          {editingExam?.isActive && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
              <p>Las preguntas y el título no pueden editarse una vez publicado para proteger la integridad del examen.</p>
            </div>
          )}

          <div className="grid gap-4 py-2">
            {/* Título — solo si es Borrador */}
            {!editingExam?.isActive && (
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Título del examen</Label>
                <Input
                  id="edit-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
            )}

            {/* Fechas — siempre editables */}
            <div className="grid gap-4">
              <DateTimePicker label="Fecha y hora de inicio" id="edit-start" value={startDate} onChange={setStartDate} />
              <DateTimePicker label="Fecha y hora de fin" id="edit-end" value={endDate} onChange={setEndDate} />
            </div>

            {/* Tiempo — solo si es Borrador */}
            {!editingExam?.isActive && (
              <div className="grid gap-2">
                <Label htmlFor="edit-time">Tiempo límite (minutos)</Label>
                <Input
                  id="edit-time"
                  type="number"
                  min={1}
                  value={form.timeLimit}
                  onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExam(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              {editSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Resultados (Admin) — Diseño Premium */}
      <Dialog open={!!resultsExam} onOpenChange={(open) => !open && setResultsExam(null)}>
        <DialogContent className="sm:max-w-3xl max-w-[calc(100%-2rem)] max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">

          {/* Header con gradiente */}
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-6 pb-5 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <TrophyIcon className="size-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold leading-tight">
                    Resultados del Concurso
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-0.5">
                    {resultsExam?.title}
                    <span className="mx-1.5 opacity-40">•</span>
                    <span className="text-primary/70 font-medium">{resultsExam?.subject.name}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Stats rápidas */}
            {!resultsLoading && examResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-lg bg-background/60 border px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-foreground">{examResults.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Participantes</p>
                </div>
                <div className="rounded-lg bg-background/60 border px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {examResults.filter(r => r.status === 'SUBMITTED').length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Entregados</p>
                </div>
                <div className="rounded-lg bg-background/60 border px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {examResults.filter(r => r.score !== null).length > 0
                      ? (examResults.filter(r => r.score !== null).reduce((a, r) => a + r.score!, 0) /
                        examResults.filter(r => r.score !== null).length).toFixed(1) + '%'
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Promedio</p>
                </div>
                <div className="rounded-lg bg-background/60 border px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-amber-500">
                    {examResults.find(r => r.rank === 1)?.score?.toFixed(1) ?? '—'}
                    {examResults.find(r => r.rank === 1)?.score !== undefined && '%'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Mejor puntaje</p>
                </div>
              </div>
            )}
          </div>

          {/* Tabla */}
          <div className="flex-1 overflow-y-auto">
            {resultsLoading ? (
              <div className="flex flex-col gap-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : examResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-4">
                <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <BarChart2Icon className="size-7 opacity-30" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Sin participantes aún</p>
                  <p className="text-sm mt-1">Nadie ha ingresado a este examen todavía.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[64px] text-center font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Alumno</TableHead>
                    <TableHead className="text-center font-semibold">Estado</TableHead>
                    <TableHead className="text-center font-semibold">Tiempo</TableHead>
                    <TableHead className="text-right font-semibold">Puntaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examResults.map((res) => {
                    const medal = res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : null
                    const isTop = res.rank <= 3 && res.status === 'SUBMITTED'
                    const initials = res.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                    return (
                      <TableRow
                        key={res.participationId}
                        className={isTop ? 'bg-amber-500/5 dark:bg-amber-500/8' : ''}
                      >
                        <TableCell className="text-center">
                          {medal ? (
                            <span className="text-xl">{medal}</span>
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">{res.rank}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {initials}
                            </div>
                            <span className="font-medium text-sm">{res.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {res.status === 'SUBMITTED' ? (
                            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 text-xs">
                              ✓ Entregado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-xs">
                              ⏳ En curso
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {res.durationMin !== null ? (
                            <span className="font-mono">{res.durationMin} min</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {res.score !== null ? (
                            <span className={`font-bold text-sm tabular-nums ${
                              res.score >= 90 ? 'text-green-600 dark:text-green-400' :
                              res.score >= 70 ? 'text-blue-600 dark:text-blue-400' :
                              'text-red-500 dark:text-red-400'
                            }`}>
                              {res.score.toFixed(1)}%
                            </span>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setResultsExam(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
