import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from '@/components/ui/breadcrumb'

import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { LoginForm } from '@/components/login-form'
import { AppSidebar } from '@/components/app-sidebar'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { DashboardHome } from '@/pages/DashboardHome'
import { QuestionsAdmin } from '@/pages/QuestionsAdmin'
import { ExamManager } from '@/pages/ExamManager'
import { ExamRoom } from '@/pages/ExamRoom'
import { ExamResult } from '@/pages/ExamResult'
import { UsersAdmin } from '@/pages/UsersAdmin'
import { LiveScoreboard } from '@/pages/LiveScoreboard'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { StudentHistory } from '@/pages/StudentHistory'

type Page = 'dashboard' | 'questions' | 'exams' | 'exam-room' | 'exam-result' | 'users' | 'reports' | 'settings' | 'history' | 'live-scoreboard'

const PAGE_LABELS: Record<Page, string> = {
  dashboard: 'Panel Principal',
  questions: 'Banco de Reactivos',
  exams: 'Exámenes',
  'exam-room': 'Examen en Curso',
  'exam-result': 'Resultado del Examen',
  users: 'Usuarios del Sistema',
  reports: 'Reportes',
  settings: 'Configuración',
  history: 'Historial',
  'live-scoreboard': 'Live Scoreboard',
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
  
  // Estado de navegación (sincronizado con el hash de la URL para persistir al recargar).
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    let hash = window.location.hash.replace('#', '') as Page
    if (!hash) hash = 'dashboard'
    
    // Proteger inicialización
    const role = localStorage.getItem('sicba_role')
    const isAdmin = role === 'ADMIN' || role === 'MAESTRO'
    if (!isAdmin && ['questions', 'users', 'reports', 'settings'].includes(hash)) {
      hash = 'dashboard'
    }
    
    return hash
  })

  // Contexto para el flujo de exámenes.
  const [activeExamId, setActiveExamId] = useState<string | null>(null)
  const [examResult, setExamResult] = useState<ExamResultData | null>(null)
  // Bloqueo de navegación cuando el alumno está dentro del examen
  const [examInProgress, setExamInProgress] = useState(false)
  const examInProgressRef = useRef(examInProgress)
  
  // Sincronizar el ref con el estado para que el listener siempre tenga el valor actual
  useEffect(() => {
    examInProgressRef.current = examInProgress
  }, [examInProgress])

  const [leaveAlertOpen, setLeaveAlertOpen] = useState(false)
  const [pendingHash, setPendingHash] = useState<Page | null>(null)

  // Escuchar cambios de hash (botones back/forward del navegador/mouse)
  useEffect(() => {
    const handleHashChange = (e: HashChangeEvent) => {
      const newHash = new URL(e.newURL).hash.replace('#', '') as Page

      // Si el alumno está en el examen e intenta salir hacia otra vista:
      // revertimos el hash y mostramos el AlertDialog.
      if (examInProgressRef.current && newHash !== 'exam-room') {
        // Revertir el hash al estado del examen para evitar salir
        window.location.hash = 'exam-room'
        setPendingHash(newHash || 'exams')
        setLeaveAlertOpen(true)
        return
      }

      // Navegación normal entre páginas
      if (newHash) setCurrentPage(newHash)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [examInProgress])

  const confirmLeaveExam = () => {
    setLeaveAlertOpen(false)
    setExamInProgress(false)
    if (pendingHash) {
      setCurrentPage(pendingHash)
      window.location.hash = pendingHash
    }
  }
  
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
          new Date(e.endTime) >= now &&
          e.myParticipation?.status !== 'SUBMITTED'
      }).length
      setExamBadgeCount(liveCount)
    } catch { /* silencioso */ }
  }, [token, isStudent])

  useEffect(() => { 
    refreshExamBadge()
    const interval = setInterval(refreshExamBadge, 15000) // Polling cada 15 segundos
    return () => clearInterval(interval)
  }, [refreshExamBadge])

  const navigateTo = (page: Page) => {
    // Protección de rutas: Alumno no puede entrar a rutas de admin
    const isAdmin = role === 'ADMIN' || role === 'MAESTRO';
    if (!isAdmin && ['questions', 'students', 'users', 'reports', 'settings'].includes(page)) {
      page = 'dashboard';
      toast.error('Acceso denegado');
    }
    
    window.location.hash = page
    setCurrentPage(page)
  }

  const handleLoginSuccess = (newToken: string) => setToken(newToken)

  const handleLogout = () => {
    localStorage.removeItem('sicba_token')
    localStorage.removeItem('sicba_role')
    localStorage.removeItem('sicba_email')
    localStorage.removeItem('sicba_name')
    setToken(null)
  }

  const handleEnterExam = (examId: string) => {
    setActiveExamId(examId)
    setExamInProgress(true)   // Bloquear navegación hacia atrás mientras está en el examen
    navigateTo('exam-room')
  }

  // Ver resultados de un examen ya entregado directamente (sin pasar por ExamRoom)
  const handleViewResult = async (examId: string) => {
    const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
    try {
      const res = await fetch(`${API}/api/exams/${examId}/my-result`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const resultData = {
          score: data.score ?? 0,
          correctCount: data.correctCount ?? 0,
          totalQuestions: data.totalQuestions ?? 0,
          breakdown: data.breakdown ?? [],
        }
        setExamResult(resultData)
        setCurrentPage('exam-result')
        window.location.hash = 'exam-result'
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('[handleViewResult] Error del API:', res.status, errData)
        // Mostrar igual la pantalla de resultado vacía con score de la participación
        toast.error(errData.error ?? 'No se pudieron cargar los resultados')
      }
    } catch (e) {
      console.error('[handleViewResult] Error de red:', e)
      toast.error('No se pudo conectar al servidor')
    }
  }

  const handleExamFinished = (result: ExamResultData) => {
    setExamInProgress(false)  // Desbloquear navegación al entregar
    examInProgressRef.current = false // Actualizar ref sincrónicamente para prevenir race condition del router
    setExamResult(result)
    navigateTo('exam-result')
  }

  const handleReturnFromResult = () => {
    setExamResult(null)
    setActiveExamId(null)
    setExamInProgress(false)
    navigateTo('exams')
  }

  const handleOpenScoreboard = (examId: string) => {
    setActiveExamId(examId)
    setCurrentPage('live-scoreboard')
    window.location.hash = 'live-scoreboard'
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
          <div className="min-h-svh flex items-center justify-center bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
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
          <AlertDialog open={leaveAlertOpen} onOpenChange={setLeaveAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Seguro que quieres salir del examen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tus respuestas guardadas se conservarán, pero el tiempo seguirá corriendo. 
                  Podrás volver a entrar siempre que quede tiempo y el profesor no lo haya cerrado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Permanecer en el examen</AlertDialogCancel>
                <AlertDialogAction onClick={confirmLeaveExam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sí, salir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

  // ─── LIVE SCOREBOARD (pantalla completa) ──────────────────────────────
  if (currentPage === 'live-scoreboard' && activeExamId) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <LiveScoreboard examId={activeExamId} onBack={() => handleReturnFromResult()} />
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
      case 'exams': return <ExamManager onEnterExam={handleEnterExam} onViewResult={handleViewResult} onOpenScoreboard={handleOpenScoreboard} />
      case 'users': return <UsersAdmin />
      case 'settings': return <SettingsPage />
      case 'reports': return <ReportsPage />
      case 'history': return <StudentHistory />
      default: return <PlaceholderPage page={currentPage} />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            onNavigate={(page) => { navigateTo(page as Page); if (page === 'exams') refreshExamBadge() }}
            currentPage={currentPage}
            onLogout={handleLogout}
            examBadgeCount={examBadgeCount}
            user={{
              name: localStorage.getItem('sicba_name') || (isStudent ? 'Alumno' : 'Administrador'),
              email: localStorage.getItem('sicba_email') || '',
              avatar: '/avatars/default.png'
            }}
          />
          <SidebarInset>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 supports-backdrop-filter:bg-background/60 backdrop-blur-md">
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
