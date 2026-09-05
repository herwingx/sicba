import { useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { LogOutIcon } from 'lucide-react'

import { LoginForm } from '@/components/login-form'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHome } from '@/pages/DashboardHome'
import { QuestionsAdmin } from '@/pages/QuestionsAdmin'

type Page = 'dashboard' | 'questions' | 'exams' | 'students' | 'users' | 'reports'

const PAGE_LABELS: Record<Page, string> = {
  dashboard: 'Panel Principal',
  questions: 'Banco de Reactivos',
  exams: 'Exámenes',
  students: 'Alumnos',
  users: 'Usuarios del Sistema',
  reports: 'Reportes',
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

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('sicba_token'))
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('sicba_token')
    localStorage.removeItem('sicba_role')
    setToken(null)
  }

  // ─── PANTALLA DE LOGIN ──────────────────────────────────────────────
  if (!token) {
    return (
      <TooltipProvider>
        <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
          <div className="w-full max-w-4xl">
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // ─── DASHBOARD PRINCIPAL ────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome />
      case 'questions':
        return <QuestionsAdmin />
      default:
        return <PlaceholderPage page={currentPage} />
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          onNavigate={(page) => setCurrentPage(page as Page)}
          currentPage={currentPage}
          onLogout={handleLogout}
        />
        <SidebarInset>
          {/* Header sticky */}
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
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOutIcon data-icon="inline-start" className="size-4" />
                Cerrar sesión
              </Button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex flex-1 flex-col">
            {renderPage()}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
