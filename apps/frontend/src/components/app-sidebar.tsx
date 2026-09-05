"use client"

import * as React from "react"
import {
  BookOpenIcon,
  ClipboardListIcon,
  GraduationCapIcon,
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string; avatar: string }
  onNavigate?: (page: string) => void
  currentPage?: string
}

export function AppSidebar({ user, onNavigate, currentPage, ...props }: AppSidebarProps) {
  const navMain = [
    {
      title: "Panel Principal",
      url: "#",
      icon: <LayoutDashboardIcon />,
      onClick: () => onNavigate?.("dashboard"),
      isActive: currentPage === "dashboard",
    },
    {
      title: "Banco de Reactivos",
      url: "#",
      icon: <BookOpenIcon />,
      onClick: () => onNavigate?.("questions"),
      isActive: currentPage === "questions",
    },
    {
      title: "Exámenes",
      url: "#",
      icon: <ClipboardListIcon />,
      onClick: () => onNavigate?.("exams"),
      isActive: currentPage === "exams",
    },
    {
      title: "Alumnos",
      url: "#",
      icon: <GraduationCapIcon />,
      onClick: () => onNavigate?.("students"),
      isActive: currentPage === "students",
    },
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
    },
  ]

  const navSecondary = [
    {
      title: "Configuración",
      url: "#",
      icon: <Settings2Icon />,
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
    name: user?.name ?? "Administrador",
    email: user?.email ?? "admin@escuela.edu.mx",
    avatar: user?.avatar ?? "/avatars/admin.jpg",
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
        <NavUser user={defaultUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
