"use client"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"

/**
 * Componente NavMain responsable de renderizar los enlaces principales de navegación.
 * Itera sobre un listado de ítems y maneja las rutas laterales mediante eventos onClick (o URLs),
 * aplicando estilos activos dinámicamente según la vista actual seleccionada.
 * Soporta un `badge` numérico para mostrar conteos de notificaciones (ej. exámenes activos).
 *
 * @param {Object} props - Objeto contenedor con los ítems de navegación.
 * @param {Array} props.items - Arreglo con la definición de cada ruta principal.
 * @returns {JSX.Element} Grupo de navegación lateral con sus enlaces.
 */
export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    onClick?: () => void
    isActive?: boolean
    badge?: number
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navegación</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                onClick={item.onClick}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
              {/* Badge de notificación — solo aparece cuando hay exámenes activos */}
              {item.badge !== undefined && (
                <SidebarMenuBadge className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {item.badge > 9 ? '9+' : item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
