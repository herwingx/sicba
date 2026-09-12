import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  PlusCircleIcon, ClipboardListIcon, Users2Icon, BookOpenIcon, Loader2Icon,
} from 'lucide-react'

interface Exam {
  id: string
  title: string
  description: string | null
  subject: { name: string }
  creator: { profile: { firstName: string; lastName: string } | null }
  isActive: boolean
  startTime: string
  endTime: string
  timeLimit: number
  _count: { questions: number; participations: number }
}

interface ExamManagerProps {
  onEnterExam?: (examId: string) => void
}

const API = 'http://localhost:3000'

export function ExamManager({ onEnterExam }: ExamManagerProps) {
  const token = localStorage.getItem('sicba_token')
  const role = localStorage.getItem('sicba_role')

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    questionIds: '',
    timeLimit: '60',
    startTime: '',
    endTime: '',
  })

  const loadExams = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    } catch {
      setError('No se pudieron cargar los exámenes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadExams() }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const questionIds = form.questionIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch(`${API}/api/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          questionIds,
          timeLimit: Number(form.timeLimit),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al crear el examen.')
      } else {
        setDialogOpen(false)
        setForm({ title: '', subjectId: '', questionIds: '', timeLimit: '60', startTime: '', endTime: '' })
        loadExams()
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCreating(false)
    }
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

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabla de exámenes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon className="size-5 text-primary" />
            Lista de Exámenes
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'Todos los exámenes creados en el sistema.' : 'Exámenes en los que puedes participar.'}
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
                  <TableHead className="text-center">
                    <BookOpenIcon className="size-4 inline" />
                  </TableHead>
                  <TableHead className="text-center">
                    <Users2Icon className="size-4 inline" />
                  </TableHead>
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
                      <TableCell>
                        <Badge variant="outline">{exam.subject.name}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">{exam._count.questions}</TableCell>
                      <TableCell className="text-center text-sm">{exam._count.participations}</TableCell>
                      <TableCell className="text-sm">{exam.timeLimit} min</TableCell>
                      <TableCell>
                        {isLive && <Badge variant="default" className="bg-green-600">En vivo</Badge>}
                        {isUpcoming && <Badge variant="secondary">Próximamente</Badge>}
                        {isFinished && <Badge variant="outline">Finalizado</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLive && !isAdmin && (
                          <Button size="sm" onClick={() => onEnterExam?.(exam.id)}>
                            Ingresar
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => onEnterExam?.(exam.id)}>
                            Ver
                          </Button>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Examen</DialogTitle>
            <DialogDescription>
              Completa los datos del concurso. Los IDs de preguntas los puedes obtener desde el Banco de Reactivos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="exam-title">Título del examen</Label>
              <Input id="exam-title" placeholder="Ej. Concurso Cálculo — Sep 2026"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exam-subject">ID de Materia (subjectId)</Label>
              <Input id="exam-subject" placeholder="UUID de la materia"
                value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exam-questions">IDs de Preguntas (separados por coma)</Label>
              <Input id="exam-questions" placeholder="uuid1, uuid2, uuid3..."
                value={form.questionIds} onChange={(e) => setForm((f) => ({ ...f, questionIds: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="exam-timelimit">Tiempo límite (min)</Label>
                <Input id="exam-timelimit" type="number" min={1}
                  value={form.timeLimit} onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="exam-start">Inicio</Label>
                <Input id="exam-start" type="datetime-local"
                  value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exam-end">Fin</Label>
                <Input id="exam-end" type="datetime-local"
                  value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              {creating ? 'Creando...' : 'Crear Examen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
