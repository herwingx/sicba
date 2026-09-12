import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2Icon, XCircleIcon, TrophyIcon, RotateCcwIcon } from 'lucide-react'
import { cn } from 'cn'

interface ExamResultProps {
  score: number
  correctCount: number
  totalQuestions: number
  onReturnToDashboard: () => void
}

export function ExamResult({ score, correctCount, totalQuestions, onReturnToDashboard }: ExamResultProps) {
  const wrongCount = totalQuestions - correctCount

  const getScoreLevel = () => {
    if (score >= 90) return { label: '¡Excelente!', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
    if (score >= 70) return { label: '¡Muy bien!', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
    if (score >= 60) return { label: 'Suficiente', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
    return { label: 'Necesitas repasar', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  }

  const level = getScoreLevel()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 gap-6">
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Tarjeta principal de resultado */}
        <Card className={cn('border-2 text-center', level.bg)}>
          <CardHeader className="pb-2">
            <div className="flex justify-center mb-2">
              <TrophyIcon className={cn('size-12', level.color)} />
            </div>
            <CardTitle className={cn('text-4xl font-black', level.color)}>
              {score.toFixed(1)}%
            </CardTitle>
            <CardDescription className={cn('text-base font-semibold', level.color)}>
              {level.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Examen entregado y calificado por el sistema</p>
          </CardContent>
        </Card>

        {/* Desglose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose de Resultados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-5 text-green-600" />
                <span className="text-sm">Respuestas correctas</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {correctCount} / {totalQuestions}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircleIcon className="size-5 text-red-500" />
                <span className="text-sm">Respuestas incorrectas o sin contestar</span>
              </div>
              <Badge variant="secondary" className="bg-red-50 text-red-600">
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

        {/* Acción */}
        <Button className="w-full" onClick={onReturnToDashboard}>
          <RotateCcwIcon data-icon="inline-start" />
          Volver al Panel Principal
        </Button>
      </div>
    </div>
  )
}
