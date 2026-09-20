/**
 * Componente UI Primitivo: skeleton
 * Basado en shadcn/ui y Radix UI Primitives.
 * Utiliza la utilidad `cn()` para la fusión segura de clases Tailwind CSS.
 * Mantiene la accesibilidad web (WAI-ARIA) por defecto.
 */

import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
