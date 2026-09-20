import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

import { LoginForm } from '@/components/login-form'
import { AppSidebar } from '@/components/app-sidebar'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { DashboardHome } from '@/pages/DashboardHome'
import { QuestionsAdmin } from '@/pages/QuestionsAdmin'
import { ExamManager } from '@/pages/ExamManager'
import { ExamRoom } from '@/pages/ExamRoom'
import { ExamResult } from '@/pages/ExamResult'
import { StudentsPage } from '@/pages/StudentsPage'

type Page = 'dashboard' | 'questions' | 'exams' | 'exam-room' | 'exam-result' | 'students' | 'users' | 'reports'

const PAGE_LABELS: Record<Page, string> = {
  dashboard: 'Panel Principal',
  questions: 'Banco de Reactivos',
  exams: 'Exámenes',
  'exam-room': 'Examen en Curso',
  'exam-result': 'Resultado del Examen',
  students: 'Alumnos',
  users: 'Usuarios del Sistema',
  reports: 'Reportes',
}

interface ExamResultData {
  score: number
  correctCount: number
  totalQuestions: number
  breakdown?: any[]
}

function PlaceholderPage({ page }: { page: Page }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10 text-muted-foreground">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{PAGE_LABELS[page]}</h2>
        <p className="text-sm mt-1">Módulo en construcción — próxima sesión</p>
      </div>
    </div>
  )
}

/**
 * Componente principal de la aplicación.
 * Gestiona el estado global (sesión, navegación y contexto del examen activo).
 * Implementa un enrutamiento condicional simple basado en el estado `currentPage`.
 */
export default function App() {
  // Estado de sesión hidratado inicialmente desde localStorage para persistencia.
  const [token, setToken] = useState<string | null>(localStorage.getItem('sicba_token'))
  
  // Estado de navegación (enrutamiento manual sin react-router para simplificar la arquitectura).
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  
  // Contexto para el flujo de exámenes.
  const [activeExamId, setActiveExamId] = useState<string | null>(null)
  const [examResult, setExamResult] = useState<ExamResultData | null>(null)
  // Badge: conteo de exámenes activos disponibles para el alumno
  const [examBadgeCount, setExamBadgeCount] = useState(0)
  const role = localStorage.getItem('sicba_role')
  const isStudent = role === 'ALUMNO'

  // Fetch del conteo de exámenes activos para el badge del alumno
  const refreshExamBadge = useCallback(async () => {
    if (!isStudent) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const now = new Date()
      const liveCount = (data as any[]).filter((e: any) => {
        return e.isActive &&
          new Date(e.startTime) <= now &&
          new Date(e.endTime) >= now &&
          e.myParticipation?.status !== 'SUBMITTED'
      }).length
      setExamBadgeCount(liveCount)
    } catch { /* silencioso */ }
  }, [token, isStudent])

  useEffect(() => { refreshExamBadge() }, [refreshExamBadge])

  const handleLoginSuccess = (newToken: string) => setToken(newToken)

  const handleLogout = () => {
    localStorage.removeItem('sicba_token')
    localStorage.removeItem('sicba_role')
    setToken(null)
  }

  const handleEnterExam = (examId: string) => {
    setActiveExamId(examId)
    setCurrentPage('exam-room')
  }

  const handleExamFinished = (result: ExamResultData) => {
    setExamResult(result)
    setCurrentPage('exam-result')
  }

  const handleReturnFromResult = () => {
    setExamResult(null)
    setActiveExamId(null)
    setCurrentPage('exams')
  }

  /**
   * Flujo de protección: Si no hay token, el usuario es forzado a la pantalla de Login.
   * ThemeProvider inyecta clases para el modo claro/oscuro en toda la app.
   */
  // ─── PANTALLA DE LOGIN ────────────────────────────────────────────────
  if (!token) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
            <div className="w-full max-w-4xl">
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    )
  }

  // ─── SALA DE EXAMEN (pantalla completa sin sidebar, sin botón salir) ──
  if (currentPage === 'exam-room' && activeExamId) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <div className="min-h-svh bg-background">
            <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
              <div className="size-5 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                S
              </div>
              <span className="text-sm font-semibold">SICBA — Examen en Curso</span>
              <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
                No cierres esta ventana hasta terminar
              </span>
            </header>
            <ExamRoom
              examId={activeExamId}
              onFinished={handleExamFinished}
              onAlreadySubmitted={handleReturnFromResult}
            />
          </div>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    )
  }

  // ─── RESULTADO DEL EXAMEN ─────────────────────────────────────────────
  if (currentPage === 'exam-result' && examResult) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <div className="min-h-svh bg-background">
            <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
              <div className="size-5 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                S
              </div>
              <span className="text-sm font-semibold">SICBA — Resultados</span>
            </header>
            <ExamResult
              score={examResult.score}
              correctCount={examResult.correctCount}
              totalQuestions={examResult.totalQuestions}
              breakdown={examResult.breakdown}
              onReturnToDashboard={handleReturnFromResult}
            />
          </div>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    )
  }

  // ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardHome />
      case 'questions': return <QuestionsAdmin />
      case 'exams': return <ExamManager onEnterExam={handleEnterExam} />
      case 'students': return <StudentsPage />
      default: return <PlaceholderPage page={currentPage} />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            onNavigate={(page) => { setCurrentPage(page as Page); if (page === 'exams') refreshExamBadge() }}
            currentPage={currentPage}
            onLogout={handleLogout}
            examBadgeCount={examBadgeCount}
          />
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{PAGE_LABELS[currentPage]}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              {/* Botón de modo oscuro: ícono compacto en el navbar, posición estándar de la industria */}
              <div className="ml-auto">
                <ThemeToggleCompact />
              </div>
            </header>

            <main className="flex flex-1 flex-col">
              {renderPage()}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </ThemeProvider>
  )
}
