import { useState, useEffect, useCallback, useRef } from 'react'
import Latex from 'react-latex-next'
import 'katex/dist/katex.min.css'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClockIcon, CheckCircle2Icon, SendIcon, Loader2Icon,
  ShieldCheckIcon, RotateCcwIcon, FlagIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Interfaz de una opción de respuesta.
 * @interface Option
 */
interface Option {
  id: string
  content: string
}

/**
 * Interfaz de un reactivo (pregunta) enviado al alumno.
 * No contiene la respuesta correcta por seguridad.
 * @interface Question
 */
interface Question {
  questionId: string
  content: string
  difficulty: number
  options: Option[]
}

/**
 * Propiedades del componente ExamRoom.
 * @interface ExamRoomProps
 */
interface ExamRoomProps {
  examId: string
  onFinished: (result: { score: number; correctCount: number; totalQuestions: number; breakdown?: any[] }) => void
  onAlreadySubmitted?: () => void
}

const API = 'http://localhost:3000'

/**
 * Componente principal para la sala de exámenes (Exam Room).
 * 
 * Este componente es el entorno seguro donde el alumno presenta su examen.
 * Características principales:
 * - Renderizado de preguntas y opciones matemáticas (LaTeX).
 * - Temporizador estricto sincronizado con la configuración del examen.
 * - Guardado automático en el servidor al seleccionar cada respuesta (prevención de pérdida de datos).
 * - Recuperación automática de respuestas si el usuario cierra o recarga el navegador.
 * - Prevención de cierre accidental (`beforeunload`).
 * 
 * @param {ExamRoomProps} props - ID del examen y callbacks de finalización.
 * @returns {JSX.Element} La interfaz de resolución de examen.
 */
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
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({})
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
        return 'Tienes un examen en curso. ¿Seguro que quieres salir? Tu progreso parcial está guardado.'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [questions.length, submitting])

  // ─── Monitor Antifraude: Tab Switch, Blur, Paste, Copy ────────────────────
  useEffect(() => {
    if (loading || alreadySubmitted || submitting || questions.length === 0) return

    const reportIncident = async (action: string, metadata: any = {}) => {
      try {
        await fetch(`${API}/api/exams/${examId}/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, metadata })
        })
        toast.error(`Incidencia detectada: ${action}`, { id: 'fraud-alert' })
      } catch (err) {
        console.error('No se pudo registrar la incidencia de auditoría', err)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportIncident('TAB_SWITCH', { url: window.location.href })
      }
    }

    const handleBlur = () => {
      reportIncident('WINDOW_BLUR', { url: window.location.href })
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      reportIncident('PASTE_ATTEMPT')
    }

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      reportIncident('COPY_ATTEMPT')
    }
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [loading, alreadySubmitted, submitting, questions.length, examId, token])

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
            id: 'resume-toast',
          })
          
          const firstUnanswered = data.questions.findIndex((q: any) => !data.savedAnswers[q.questionId])
          if (firstUnanswered !== -1) {
            setCurrentIndex(firstUnanswered)
          } else {
            setCurrentIndex(data.questions.length - 1)
          }
        }

        // Calcular tiempo restante robusto (con fallback para compatibilidad temporal)
        const globalEndTime = new Date(data.endTime).getTime()
        const startedAt = data.startedAt ? new Date(data.startedAt).getTime() : Date.now()
        const personalEndTime = startedAt + data.timeLimit * 60 * 1000
        
        const finalEndTime = Math.min(globalEndTime, personalEndTime)
        const remaining = Math.floor((finalEndTime - Date.now()) / 1000)
        
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

  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const isLastQuestion = currentIndex === questions.length - 1
  const timeWarning = timeLeft < 120
  const timeDanger = timeLeft < 60

  const items = questions.map((q) => ({
    name: q.questionId,
    required: false,
    prompt: <Latex>{q.content}</Latex>,
    difficulty: q.difficulty,
    choices: q.options.map((opt) => ({
      value: opt.id,
      label: <Latex>{opt.content}</Latex>,
    })),
  }))

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
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full items-start">
      <div className="flex-1 w-full min-w-0 flex flex-col gap-4">
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

        {/* Questionnaire Component */}
        <div className="mt-4">
          <Progress value={progress} className="w-full mb-8">
            <div className="flex w-full items-center justify-between mb-2">
              <ProgressLabel>Progreso del examen</ProgressLabel>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {answeredCount} de {questions.length} preguntas
              </span>
            </div>
          </Progress>

          <Questionnaire items={items} item={questions[currentIndex]?.questionId} onItemChange={(val) => {
            const idx = questions.findIndex(q => q.questionId === val)
            if (idx !== -1) setCurrentIndex(idx)
          }}>
            {items.map((question, index) => (
              <QuestionnaireItem
                key={question.name}
                name={question.name}
                required={question.required}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Pregunta {index + 1} de {questions.length}
                    </Badge>
                    <Badge variant="secondary">
                      {'⭐'.repeat(question.difficulty)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 gap-1.5", markedForReview[question.name] ? "text-orange-500 bg-orange-50 dark:bg-orange-950/30" : "text-muted-foreground")}
                    onClick={() => toggleMarkForReview(question.name)}
                  >
                    <FlagIcon className={cn("size-4", markedForReview[question.name] && "fill-orange-500")} />
                    <span className="hidden sm:inline">
                      {markedForReview[question.name] ? 'Marcada para revisión' : 'Marcar para revisión'}
                    </span>
                  </Button>
                </div>
                <QuestionnaireTitle className="text-lg mb-6 leading-relaxed">
                  {question.prompt}
                </QuestionnaireTitle>
                <QuestionnaireChoices>
                  {question.choices.map((choice, i) => {
                    const isSelected = answers[question.name] === choice.value
                    const letter = String.fromCharCode(65 + i)
                    return (
                      <QuestionnaireChoice 
                        key={choice.value} 
                        value={choice.value} 
                        checked={isSelected}
                        onChange={() => handleSelectOption(question.name, choice.value)}
                      >
                        <span className="font-medium flex items-center justify-between gap-2 w-full">
                          <span>{choice.label}</span>
                          <span className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors border ml-auto',
                            isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-input dark:bg-input/50'
                          )}>
                            {isSelected ? <CheckCircle2Icon className="size-3" /> : letter}
                          </span>
                        </span>
                      </QuestionnaireChoice>
                    )
                  })}
                </QuestionnaireChoices>
              </QuestionnaireItem>
            ))}
            <QuestionnaireActions className="mt-6 pt-6 border-t flex justify-between gap-2">
              <QuestionnairePrevious variant="outline">Anterior</QuestionnairePrevious>
              
              <div className="flex ml-auto gap-2">
                {!isLastQuestion ? (
                  <QuestionnaireNext>Siguiente</QuestionnaireNext>
                ) : (
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
                )}
              </div>
            </QuestionnaireActions>
          </Questionnaire>
        </div>
      </div>

      {/* Grid lateral de progreso */}
      <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
        <div className="sticky top-20 rounded-xl border bg-card text-card-foreground shadow-sm p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-primary" />
            Estado del Examen
          </h3>
          
          <div className="grid grid-cols-5 gap-2 mb-6">
            {questions.map((q, idx) => {
              const qId = q.questionId
              const isAnswered = !!answers[qId]
              const isMarked = markedForReview[qId]
              const isActive = currentIndex === idx

              return (
                <Button
                  key={qId}
                  variant={isActive ? "default" : isAnswered ? "secondary" : "outline"}
                  className={cn(
                    "h-10 w-full p-0 font-mono text-sm relative transition-all",
                    isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                    isMarked && !isActive ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" : ""
                  )}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                  {isMarked && (
                    <FlagIcon className={cn("size-3 absolute -top-1 -right-1", isActive ? "text-primary-foreground fill-primary-foreground" : "text-orange-500 fill-orange-500")} />
                  )}
                </Button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-secondary border" /> Respondida
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-background border" /> Pendiente
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-orange-100 border border-orange-300 dark:bg-orange-900/50" /> Para revisión
            </div>
          </div>
          
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
          >
            <SendIcon className="mr-2 size-4" /> Terminar Examen
          </Button>
        </div>
      </div>
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
