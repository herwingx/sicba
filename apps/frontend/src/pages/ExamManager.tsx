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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  PlusCircleIcon, ClipboardListIcon, Users2Icon, BookOpenIcon, Loader2Icon, CopyIcon, CheckIcon,
} from 'lucide-react'
import { DateTimePicker } from '@/components/date-time-picker'

interface Exam {
  id: string
  title: string
  subject: { name: string }
  isActive: boolean
  startTime: string
  endTime: string
  timeLimit: number
  _count: { questions: number; participations: number }
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

// ─── Mini-componente para copiar ID al portapapeles ───────────────────────────
function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono text-muted-foreground hover:bg-accent transition-colors"
      title="Copiar ID"
    >
      {id.slice(0, 8)}…{copied ? <CheckIcon className="size-3 text-green-600" /> : <CopyIcon className="size-3" />}
    </button>
  )
}

export function ExamManager({ onEnterExam }: ExamManagerProps) {
  const token = localStorage.getItem('sicba_token')
  const role = localStorage.getItem('sicba_role')

  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])

  // Form state
  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    timeLimit: '60',
  })
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const headers = { Authorization: `Bearer ${token}` }

  const loadExams = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/exams`, { headers })
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    } catch { setError('No se pudieron cargar los exámenes.') }
    finally { setLoading(false) }
  }

  const loadSubjects = async () => {
    try {
      const res = await fetch(`${API}/api/subjects`, { headers })
      if (res.ok) setSubjects(await res.json())
    } catch { /* silencioso */ }
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
      setError('Selecciona la fecha y hora de inicio y fin.')
      return
    }
    if (selectedQuestionIds.length === 0) {
      setError('Selecciona al menos una pregunta.')
      return
    }

    setCreating(true)
    setError('')
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
        setError(data.error || 'Error al crear el examen.')
      } else {
        setDialogOpen(false)
        setForm({ title: '', subjectId: '', timeLimit: '60' })
        setStartDate(undefined)
        setEndDate(undefined)
        setSelectedQuestionIds([])
        setQuestions([])
        loadExams()
      }
    } catch { setError('No se pudo conectar con el servidor.') }
    finally { setCreating(false) }
  }

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
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircleIcon data-icon="inline-start" />
            Crear Examen
          </Button>
        )}
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
                {isAdmin ? 'No hay exámenes creados. ¡Crea el primero!' : 'No hay exámenes disponibles.'}
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
                  const isFinished = !exam.isActive || now > end

                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell><Badge variant="outline">{exam.subject.name}</Badge></TableCell>
                      <TableCell className="text-center text-sm">{exam._count.questions}</TableCell>
                      <TableCell className="text-center text-sm">{exam._count.participations}</TableCell>
                      <TableCell className="text-sm">{exam.timeLimit} min</TableCell>
                      <TableCell>
                        {isLive && <Badge className="bg-green-600">En vivo</Badge>}
                        {isUpcoming && <Badge variant="secondary">Próximamente</Badge>}
                        {isFinished && <Badge variant="outline">Finalizado</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {(isLive && !isAdmin) && (
                          <Button size="sm" onClick={() => onEnterExam?.(exam.id)}>Ingresar</Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => onEnterExam?.(exam.id)}>Ver</Button>
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

      {/* Dialog: Crear Examen */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Examen</DialogTitle>
            <DialogDescription>
              Selecciona la materia, las preguntas del banco y configura el horario.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
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
              {subjects.length > 0 ? (
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
                <div className="flex flex-col gap-1">
                  <Input id="exam-subject" placeholder="ID de la materia (UUID)"
                    value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Endpoint /api/subjects no disponible — ingresa el UUID directamente.</p>
                </div>
              )}
            </div>

            {/* Preguntas */}
            {questions.length > 0 ? (
              <div className="grid gap-2">
                <Label>Preguntas del Banco <span className="text-muted-foreground text-xs">({selectedQuestionIds.length} seleccionadas)</span></Label>
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
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
                          <p className="truncate text-xs text-muted-foreground font-mono">{q.id.slice(0, 16)}…</p>
                          <p className="truncate">{q.content.replace(/\$.*?\$/g, '[fórmula]').slice(0, 60)}…</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
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

            {/* Fechas con DateTimePicker */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateTimePicker label="Fecha y hora de inicio" id="exam-start" value={startDate} onChange={setStartDate} />
              <DateTimePicker label="Fecha y hora de fin" id="exam-end" value={endDate} onChange={setEndDate} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setError('') }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.title || !form.subjectId}>
              {creating && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              {creating ? 'Creando...' : 'Crear Examen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
