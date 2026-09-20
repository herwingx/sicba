import { useState, useEffect, useCallback, useRef } from 'react'
import Latex from 'react-latex-next'
import 'katex/dist/katex.min.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClockIcon, CheckCircle2Icon, ChevronRightIcon, SendIcon, Loader2Icon,
  ShieldCheckIcon, RotateCcwIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Option {
  id: string
  content: string
}

interface Question {
  questionId: string
  content: string
  difficulty: number
  options: Option[]
}

interface ExamRoomProps {
  examId: string
  onFinished: (result: { score: number; correctCount: number; totalQuestions: number; breakdown?: any[] }) => void
  onAlreadySubmitted?: () => void
}

const API = 'http://localhost:3000'

export function ExamRoom({ examId, onFinished, onAlreadySubmitted }: ExamRoomProps) {
  const token = localStorage.getItem('sicba_token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resumed, setResumed] = useState(false) // Si el alumno está reanudando
  const participationIdRef = useRef<string>('')

  /**
   * EXTREMADAMENTE IMPORTANTE:
   * Evento `beforeunload` para evitar que el usuario cierre accidentalmente la ventana
   * o recargue la página mientras tiene un examen activo sin entregar.
   * Ayuda a prevenir la pérdida de estado temporal no sincronizado.
   */
  // ─── Anti-cierre: advertir al usuario si intenta cerrar el navegador ─────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (questions.length > 0 && !submitting) {
        e.preventDefault()
        // Mensaje estándar — el navegador lo reemplaza con el suyo propio
        return 'Tienes un examen en curso. ¿Seguro que quieres salir? Tu progreso parcial está guardado.'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [questions.length, submitting])

  // ─── Iniciar / reanudar examen ────────────────────────────────────────────
  useEffect(() => {
    const startExam = async () => {
      try {
        const res = await fetch(`${API}/api/exams/${examId}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (res.status === 409 && data.alreadySubmitted) {
          // El alumno ya entregó este examen
          setAlreadySubmitted(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError(data.error || 'No se pudo iniciar el examen.')
          setLoading(false)
          return
        }

        participationIdRef.current = data.participationId
        setExamTitle(data.title)
        setQuestions(data.questions)

        /**
         * Manejo de `savedAnswers` (Reanudación):
         * Si el usuario experimentó una desconexión o cerró el navegador de manera forzada,
         * el backend devuelve las respuestas guardadas previamente.
         * Esto permite poblar el estado local `answers` y continuar donde se quedó.
         */
        // Reanudar respuestas guardadas si el alumno cerró el navegador
        if (data.savedAnswers && Object.keys(data.savedAnswers).length > 0) {
          setAnswers(data.savedAnswers)
          setResumed(true)
          toast.info(`Reanudando examen — ${Object.keys(data.savedAnswers).length} respuestas recuperadas`, {
            duration: 4000,
          })
        }

        // Calcular tiempo restante basado en endTime del servidor
        const endTime = new Date(data.endTime).getTime()
        const remaining = Math.min(
          Math.floor((endTime - Date.now()) / 1000),
          data.timeLimit * 60
        )
        setTimeLeft(Math.max(0, remaining))
      } catch (err) {
        console.error('Error al iniciar examen:', err)
        setError('No se pudo conectar con el servidor. Verifica que el backend esté activo.')
      } finally {
        setLoading(false)
      }
    }

    startExam()
  }, [examId, token])

  /**
   * Lógica del temporizador:
   * Se utiliza un `setInterval` que decrementa `timeLeft` cada segundo.
   * Cuando el tiempo llega a 0, se fuerza la entrega automática del examen 
   * invocando `handleSubmit(true)`.
   */
  // ─── Temporizador ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0 || loading || submitting) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          handleSubmit(true)
          return 0
        }
        if (t === 120) toast.warning('⏰ Quedan 2 minutos')
        if (t === 60) toast.error('⚠️ Queda 1 minuto — ¡entrega pronto!')
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft, loading, submitting])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSelectOption = useCallback(async (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    try {
      await fetch(`${API}/api/exams/${examId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId, selectedOptionId: optionId }),
      })
    } catch {
      // Silencioso — se intentará de nuevo al hacer submit
    }
  }, [examId, token])

  const handleSubmit = async (_auto = false) => {
    if (submitting) return
    setSubmitting(true)
    setConfirmOpen(false)
    try {
      const res = await fetch(`${API}/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.ok) {
        window.onbeforeunload = null
        onFinished({
          score: data.score,
          correctCount: data.correctCount,
          totalQuestions: data.totalQuestions,
          breakdown: data.breakdown ?? [],
        })
      } else {
        toast.error(data.error || 'Error al entregar el examen.')
        setSubmitting(false)
      }
    } catch {
      toast.error('No se pudo conectar con el servidor al entregar.')
      setSubmitting(false)
    }
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const isLastQuestion = currentIndex === questions.length - 1
  const timeWarning = timeLeft < 120
  const timeDanger = timeLeft < 60

  // ─── Pantalla de carga ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-10 min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <ShieldCheckIcon className="size-6 text-primary" />
          </div>
          <p className="font-semibold">Preparando tu examen...</p>
          <p className="text-sm text-muted-foreground">Cargando preguntas y verificando sesión</p>
        </div>
        <div className="w-full max-w-md flex flex-col gap-3">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        </div>
      </div>
    )
  }

  // ─── Ya entregó este examen ───────────────────────────────────────────────
  if (alreadySubmitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-10 min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <div className="size-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold">Ya entregaste este examen</h2>
          <p className="text-sm text-muted-foreground">
            Tu examen ya fue calificado. Puedes ver tus resultados en la sección de Exámenes.
          </p>
          <Button onClick={onAlreadySubmitted} className="mt-2">
            <RotateCcwIcon data-icon="inline-start" />
            Volver a Exámenes
          </Button>
        </div>
      </div>
    )
  }

  // ─── Error general ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 gap-4 min-h-[60vh]">
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-6 py-5 text-destructive text-center max-w-md w-full">
          <p className="font-semibold mb-1">No se pudo cargar el examen</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    )
  }

  // ─── Sala de examen ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Banner de reanudación */}
      {resumed && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-2.5 text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
          <RotateCcwIcon className="size-4 shrink-0" />
          Examen reanudado — tus respuestas anteriores fueron recuperadas.
        </div>
      )}

      {/* Header del examen */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight truncate">{examTitle}</h1>
          {/* Temporizador */}
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold transition-colors shrink-0 ml-2',
            timeDanger ? 'bg-destructive text-destructive-foreground animate-pulse' :
            timeWarning ? 'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' :
            'bg-muted text-muted-foreground'
          )}>
            <ClockIcon className="size-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {answeredCount} / {questions.length} respondidas
          </span>
        </div>
      </div>

      {/* Pregunta actual */}
      {currentQuestion && (
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                Pregunta {currentIndex + 1} de {questions.length}
              </Badge>
              <Badge variant="secondary">
                {'⭐'.repeat(currentQuestion.difficulty)}
              </Badge>
            </div>
            <CardTitle className="text-base font-normal leading-relaxed mt-2">
              <Latex>{currentQuestion.content}</Latex>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {currentQuestion.options.map((opt, i) => {
              const selected = answers[currentQuestion.questionId] === opt.id
              const letter = String.fromCharCode(65 + i)
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.questionId, opt.id)}
                  className={cn(
                    'flex items-start gap-3 w-full rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150',
                    'hover:border-primary/50 hover:bg-accent/50',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-background'
                  )}
                >
                  <span className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {selected ? <CheckCircle2Icon className="size-3.5" /> : letter}
                  </span>
                  <span className="leading-relaxed">
                    <Latex>{opt.content}</Latex>
                  </span>
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          Anterior
        </Button>

        <div className="flex gap-1 flex-wrap justify-center">
          {questions.map((q, i) => (
            <button
              key={q.questionId}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'size-7 rounded text-xs font-medium transition-colors',
                i === currentIndex ? 'bg-primary text-primary-foreground' :
                answers[q.questionId] ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' :
                'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {isLastQuestion ? (
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
          >
            {submitting
              ? <><Loader2Icon data-icon="inline-start" className="animate-spin" />Entregando...</>
              : <><SendIcon data-icon="inline-start" />Entregar Examen</>
            }
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
            Siguiente
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        )}
      </div>

      {/* Confirmación de entrega */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Entregar el examen?</AlertDialogTitle>
            <AlertDialogDescription>
              Has respondido <strong>{answeredCount}</strong> de <strong>{questions.length}</strong> preguntas.
              {answeredCount < questions.length && (
                <span className="block mt-1 text-orange-600 dark:text-orange-400 font-medium">
                  ⚠️ Tienes {questions.length - answeredCount} pregunta(s) sin responder.
                </span>
              )}
              <span className="block mt-1">Una vez entregado no podrás modificar tus respuestas.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir revisando</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)}>
              Sí, entregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
