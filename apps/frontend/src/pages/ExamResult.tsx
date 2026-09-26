import { useState } from 'react'
import Latex from 'react-latex-next'
import 'katex/dist/katex.min.css'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2Icon, XCircleIcon, TrophyIcon, RotateCcwIcon,
  MinusCircleIcon, ChevronDownIcon, ChevronUpIcon, LightbulbIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Interfaz que representa el desglose (breakdown) de una pregunta individual respondida.
 * Utilizado para mostrar la retroalimentación al finalizar un examen.
 * @interface BreakdownItem
 */
interface BreakdownItem {
  questionId: string
  content: string
  difficulty: number
  explanation: string | null
  selectedOptionId: string | null
  selectedOptionContent: string | null
  correctOptionId: string | null
  correctOptionContent: string | null
  isCorrect: boolean
  options: { id: string; content: string; isCorrect: boolean }[]
}

/**
 * Propiedades recibidas por el componente ExamResult.
 * @interface ExamResultProps
 */
interface ExamResultProps {
  score: number
  correctCount: number
  totalQuestions: number
  breakdown?: BreakdownItem[]
  onReturnToDashboard: () => void
}

/**
 * Componente principal para mostrar el resultado de un examen recién finalizado.
 * 
 * Presenta una tarjeta resumen con la calificación (Score), reactivos correctos/incorrectos
 * y un porcentaje. Además, renderiza de forma interactiva (acordeón) el desglose de cada
 * pregunta, incluyendo soporte para LaTeX (`react-latex-next`) tanto en las preguntas 
 * como en las opciones y explicaciones.
 * 
 * @param {ExamResultProps} props - Propiedades: score, correctCount, totalQuestions, breakdown, onReturnToDashboard
 * @returns {JSX.Element} Vista de resultados.
 */
export function ExamResult({ score, correctCount, totalQuestions, breakdown = [], onReturnToDashboard }: ExamResultProps) {
  // Índice para controlar el acordeón de la retroalimentación pregunta por pregunta.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const wrongCount = totalQuestions - correctCount

  /**
   * Calcula de forma dinámica los estilos (clases CSS) y etiquetas
   * basándose en la calificación obtenida por el alumno.
   */
  const getScoreLevel = () => {
    if (score >= 90) return {
      label: '¡Excelente!',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    }
    if (score >= 70) return {
      label: '¡Muy bien!',
      color: 'text-secondary-foreground',
      bg: 'bg-secondary/10 border-border',
    }
    if (score >= 60) return {
      label: 'Suficiente',
      color: 'text-accent-foreground',
      bg: 'bg-accent/10 border-border',
    }
    return {
      label: 'Necesitas repasar',
      color: 'text-destructive',
      bg: 'bg-destructive/10 border-destructive/20',
    }
  }

  const level = getScoreLevel()

  return (
    <div className="flex flex-col items-center justify-start min-h-[70vh] p-4 md:p-6 gap-6 max-w-2xl mx-auto w-full">

      {/* Tarjeta principal de resultado */}
      <Card className={cn('border-2 text-center w-full', level.bg)}>
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-2">
            <TrophyIcon className={cn('size-12', level.color)} />
          </div>
          <CardTitle className={cn('text-5xl font-black', level.color)}>
            {score.toFixed(1)}%
          </CardTitle>
          <CardDescription className={cn('text-base font-semibold', level.color)}>
            {level.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Examen calificado por el sistema</p>
        </CardContent>
      </Card>

      {/* Resumen numérico */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-primary" />
              <span className="text-sm">Correctas</span>
            </div>
            <Badge className="bg-primary/20 text-primary">
              {correctCount} / {totalQuestions}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircleIcon className="size-5 text-destructive" />
              <span className="text-sm">Incorrectas o sin contestar</span>
            </div>
            <Badge className="bg-destructive/10 text-destructive">
              {wrongCount} / {totalQuestions}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Calificación final</span>
            <span className={cn('text-lg font-bold', level.color)}>{score.toFixed(2)}%</span>
          </div>
        </CardContent>
      </Card>

      {/*
       * Renderizado del breakdown (desglose de preguntas):
       * Se utiliza la librería react-latex-next (<Latex>) para renderizar correctamente
       * expresiones y fórmulas matemáticas dentro del contenido de las preguntas y opciones.
       */}
      {breakdown.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Retroalimentación — Pregunta por pregunta
          </h2>
          {breakdown.map((item, i) => {
            const isExpanded = expandedIndex === i
            const icon = item.selectedOptionId === null
              ? <MinusCircleIcon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
              : item.isCorrect
                ? <CheckCircle2Icon className="size-5 text-primary shrink-0 mt-0.5" />
                : <XCircleIcon className="size-5 text-destructive shrink-0 mt-0.5" />

            return (
              <Card
                key={item.questionId}
                className={cn(
                  'overflow-hidden transition-all',
                  item.isCorrect
                    ? 'border-primary'
                    : item.selectedOptionId === null
                      ? 'border-border'
                      : 'border-destructive'
                )}
              >
                {/* Header de la pregunta — clic para expandir */}
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-muted-foreground">Pregunta {i + 1}</span>
                      <Badge variant="outline" className="text-xs py-0">{'⭐'.repeat(item.difficulty)}</Badge>
                    </div>
                    <p className="text-sm leading-snug line-clamp-2">
                      <Latex>{item.content}</Latex>
                    </p>
                  </div>
                  <span className="shrink-0 text-muted-foreground mt-0.5">
                    {isExpanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                  </span>
                </button>

                {/* Desglose expandido */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 flex flex-col gap-3 bg-muted/20">
                    {/* Opciones */}
                    <div className="flex flex-col gap-2">
                      {item.options.map((opt) => {
                        const isSelected = opt.id === item.selectedOptionId
                        const isCorrectOpt = opt.isCorrect
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              'flex items-start gap-2 rounded-md px-3 py-2 text-sm border',
                              isCorrectOpt
                                ? 'border-primary bg-primary/10'
                                : isSelected && !isCorrectOpt
                                  ? 'border-destructive bg-destructive/10'
                                  : 'border-border bg-background'
                            )}
                          >
                            <span className="shrink-0 mt-0.5">
                              {isCorrectOpt
                                ? <CheckCircle2Icon className="size-4 text-primary" />
                                : isSelected
                                  ? <XCircleIcon className="size-4 text-destructive" />
                                  : <span className="size-4 inline-block" />
                              }
                            </span>
                            <span className="leading-relaxed">
                              <Latex>{opt.content}</Latex>
                            </span>
                            {isSelected && !isCorrectOpt && (
                              <Badge variant="outline" className="ml-auto shrink-0 text-xs text-destructive border-destructive">
                                Tu respuesta
                              </Badge>
                            )}
                            {isCorrectOpt && (
                              <Badge className="ml-auto shrink-0 text-xs bg-primary text-primary-foreground">
                                Correcta
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* No respondida */}
                    {!item.selectedOptionId && (
                      <p className="text-xs text-muted-foreground italic">Sin respuesta</p>
                    )}

                    {/* Explicación si existe */}
                    {item.explanation && (
                      <div className="flex gap-2 rounded-md bg-muted border border-border px-3 py-2.5">
                        <LightbulbIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <Latex>{item.explanation}</Latex>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Acción */}
      <Button className="w-full" onClick={onReturnToDashboard}>
        <RotateCcwIcon data-icon="inline-start" />
        Volver al Panel Principal
      </Button>
    </div>
  )
}
