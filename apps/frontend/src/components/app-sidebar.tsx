"use client"

import * as React from "react"
import {
  BookOpenIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  CircleHelpIcon,
  UsersIcon,
  ShieldCheckIcon,
  BarChartIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

/**
 * Propiedades para el componente de la barra lateral de la aplicación.
 * @interface AppSidebarProps
 * @extends React.ComponentProps<typeof Sidebar>
 */
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string; avatar: string }
  onNavigate?: (page: string) => void
  currentPage?: string
  onLogout?: () => void
  examBadgeCount?: number
}

/**
 * Componente principal de la barra lateral (Sidebar) de la aplicación.
 * Actúa como contenedor de alto nivel para inyectar y distribuir las vistas de navegación,
 * integrando las secciones principales, secundarias, información del usuario y el toggle de temas.
 * 
 * @param {AppSidebarProps} props - Propiedades del componente incluyendo usuario y handlers.
 * @returns {JSX.Element} La estructura principal de navegación lateral.
 */
export function AppSidebar({ user, onNavigate, currentPage, onLogout, examBadgeCount = 0, ...props }: AppSidebarProps) {
  const role = typeof window !== 'undefined' ? localStorage.getItem('sicba_role') : null;
  const isAdmin = role === 'ADMIN' || role === 'MAESTRO';

  const navMain = [
    {
      title: "Panel Principal",
      url: "#",
      icon: <LayoutDashboardIcon />,
      onClick: () => onNavigate?.("dashboard"),
      isActive: currentPage === "dashboard",
    },
    ...(isAdmin ? [{
      title: "Banco de Reactivos",
      url: "#",
      icon: <BookOpenIcon />,
      onClick: () => onNavigate?.("questions"),
      isActive: currentPage === "questions",
    }] : []),
    {
      title: "Exámenes",
      url: "#",
      icon: <ClipboardListIcon />,
      onClick: () => onNavigate?.("exams"),
      isActive: currentPage === "exams",
      badge: examBadgeCount > 0 ? examBadgeCount : undefined,
    },
    ...(!isAdmin ? [{
      title: "Mi Historial",
      url: "#",
      icon: <BarChartIcon />,
      onClick: () => onNavigate?.("history"),
      isActive: currentPage === "history",
    }] : []),
    ...(isAdmin ? [
      {
        title: "Usuarios del Sistema",
        url: "#",
        icon: <UsersIcon />,
        onClick: () => onNavigate?.("users"),
        isActive: currentPage === "users",
      },
      {
        title: "Reportes",
        url: "#",
        icon: <BarChartIcon />,
        onClick: () => onNavigate?.("reports"),
        isActive: currentPage === "reports",
      }
    ] : [])
  ]

  const navSecondary = [
    {
      title: "Configuración",
      url: "#",
      icon: <Settings2Icon />,
      onClick: () => onNavigate?.("settings"),
    },
    {
      title: "Ayuda",
      url: "#",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Seguridad",
      url: "#",
      icon: <ShieldCheckIcon />,
    },
  ]

  const defaultUser = {
    name: user?.name ?? (isAdmin ? "Administrador" : "Alumno"),
    email: user?.email ?? (isAdmin ? "admin@escuela.edu.mx" : "alumno@escuela.edu.mx"),
    avatar: user?.avatar ?? (isAdmin ? "/avatars/admin.jpg" : "/avatars/student.jpg"),
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="#" />}
            >
              <div className="size-5 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                S
              </div>
              <span className="text-base font-bold tracking-tight">SICBA</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={defaultUser} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
