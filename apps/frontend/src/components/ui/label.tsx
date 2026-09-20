/**
 * Componente UI Primitivo: label
 * Basado en shadcn/ui y Radix UI Primitives.
 * Utiliza la utilidad `cn()` para la fusión segura de clases Tailwind CSS.
 * Mantiene la accesibilidad web (WAI-ARIA) por defecto.
 */

import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
